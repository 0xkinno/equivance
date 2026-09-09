// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IB20Asset.sol";
import "./B20StateReader.sol";
import "./RiskEngine.sol";
import "./PositionMath.sol";
import "./EQUIVANCEPosition.sol";

/**
 * @title EQUIVANCEVault
 * @notice Corporate-Action-Coherent Credit Vault for Base B20 Tokenized Stocks
 * @dev Enforces the primary invariant: No risk-changing operation may execute against a cached multiplier.
 */
contract EQUIVANCEVault is EQUIVANCEPosition {
    using PositionMath for uint256;

    uint256 public constant WAD = 1e18;

    RiskEngine public immutable riskEngine;
    B20StateReader public immutable stateReader;
    IERC20 public immutable debtToken; // e.g. USDC (scaled to 18 decimals internally)
    address public owner;

    bool private _locked;

    event Deposited(address indexed user, address indexed asset, uint256 rawAmount, uint256 effectiveMultiplier);
    event Borrowed(address indexed user, address indexed asset, uint256 borrowAmountUsd, uint256 totalDebtUsd);
    event Repaid(address indexed user, address indexed asset, uint256 repayAmountUsd, uint256 remainingDebtUsd);
    event Withdrawn(address indexed user, address indexed asset, uint256 rawAmount, uint256 remainingRaw);
    event Liquidated(
        address indexed liquidator,
        address indexed borrower,
        address indexed asset,
        uint256 debtRepaidUsd,
        uint256 rawCollateralSeized,
        uint256 uiCollateralSeized
    );

    error ReentrancyGuard();
    error InsufficientCollateral(uint256 requestedDebt, uint256 maxDebt);
    error UnhealthyPositionAfterAction(uint256 healthFactor);
    error PositionHealthy();
    error TransferFailed();
    error ZeroAmount();
    error AssetBlocked();
    error OracleStale();
    error Unauthorized();

    modifier nonReentrant() {
        if (_locked) revert ReentrancyGuard();
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _riskEngine, address _stateReader, address _debtToken) {
        require(_riskEngine != address(0) && _stateReader != address(0) && _debtToken != address(0), "Invalid address");
        riskEngine = RiskEngine(_riskEngine);
        stateReader = B20StateReader(_stateReader);
        debtToken = IERC20(_debtToken);
        owner = msg.sender;
    }

    /**
     * @notice Deposit raw B20 tokenized stock collateral
     * @param asset Address of the B20 asset
     * @param rawAmount Unscaled token units to deposit
     */
    function deposit(address asset, uint256 rawAmount) public nonReentrant {
        if (rawAmount == 0) revert ZeroAmount();

        Position memory pos = _positions[msg.sender][asset];
        uint256 newRawCollateral = pos.rawCollateral + rawAmount;

        // Perform safe transfer from user to vault
        _safeTransferFrom(asset, msg.sender, address(this), rawAmount);

        // Update internal accounting
        _updatePosition(msg.sender, asset, newRawCollateral, pos.debtAmountUsd);

        // Inspect live state for event logging
        B20StateReader.B20State memory b20State = stateReader.getB20State(asset, address(this));
        emit Deposited(msg.sender, asset, rawAmount, b20State.effectiveMultiplier);
    }

    /**
     * @notice Add collateral (alias for deposit)
     */
    function addCollateral(address asset, uint256 rawAmount) external {
        deposit(asset, rawAmount);
    }

    /**
     * @notice Borrow stablecoin against deposited B20 collateral
     * @dev Re-derives collateral valuation dynamically from current block timestamp
     * @param asset Collateral asset backing the borrow
     * @param borrowAmountUsd Desired debt amount in 18-decimal USD WAD
     */
    function borrow(address asset, uint256 borrowAmountUsd) external nonReentrant {
        if (borrowAmountUsd == 0) revert ZeroAmount();

        Position memory pos = _positions[msg.sender][asset];
        uint256 newDebt = pos.debtAmountUsd + borrowAmountUsd;

        // Canonical live risk evaluation at CURRENT block timestamp
        RiskEngine.EvaluationResult memory eval = riskEngine.evaluatePosition(
            asset,
            pos.rawCollateral,
            newDebt
        );

        if (eval.status == RiskEngine.PositionStatus.BLOCKED) revert AssetBlocked();
        if (eval.status == RiskEngine.PositionStatus.STALE_ORACLE) revert OracleStale();
        if (newDebt > eval.maxDebtUsd) revert InsufficientCollateral(newDebt, eval.maxDebtUsd);
        if (!eval.isHealthy) revert UnhealthyPositionAfterAction(eval.healthFactor);

        // Update state
        _updatePosition(msg.sender, asset, pos.rawCollateral, newDebt);

        // Transfer debt token (denormalized if token has non-18 decimals)
        uint8 debtDecimals = debtToken.decimals();
        uint256 transferAmount = PositionMath.denormalizeFromWad(borrowAmountUsd, debtDecimals);
        _safeTransfer(address(debtToken), msg.sender, transferAmount);

        emit Borrowed(msg.sender, asset, borrowAmountUsd, newDebt);
    }

    /**
     * @notice Repay outstanding debt
     * @param asset Collateral asset backing the debt
     * @param repayAmountUsd Debt amount to repay in 18-decimal USD WAD
     */
    function repay(address asset, uint256 repayAmountUsd) external nonReentrant {
        if (repayAmountUsd == 0) revert ZeroAmount();

        Position memory pos = _positions[msg.sender][asset];
        if (repayAmountUsd > pos.debtAmountUsd) {
            repayAmountUsd = pos.debtAmountUsd;
        }

        uint256 remainingDebt = pos.debtAmountUsd - repayAmountUsd;

        // Transfer debt token from user to vault
        uint8 debtDecimals = debtToken.decimals();
        uint256 transferAmount = PositionMath.denormalizeFromWad(repayAmountUsd, debtDecimals);
        _safeTransferFrom(address(debtToken), msg.sender, address(this), transferAmount);

        // Update state
        _updatePosition(msg.sender, asset, pos.rawCollateral, remainingDebt);

        emit Repaid(msg.sender, asset, repayAmountUsd, remainingDebt);
    }

    /**
     * @notice Withdraw raw B20 token collateral
     * @dev Re-evaluates remaining position to guarantee health factor >= 1.0e18
     * @param asset Collateral asset to withdraw
     * @param rawAmount Unscaled token units to withdraw
     */
    function withdraw(address asset, uint256 rawAmount) external nonReentrant {
        if (rawAmount == 0) revert ZeroAmount();

        Position memory pos = _positions[msg.sender][asset];
        require(rawAmount <= pos.rawCollateral, "Exceeds deposited balance");

        uint256 remainingRaw = pos.rawCollateral - rawAmount;

        // If user has outstanding debt, verify solvency with reduced collateral
        if (pos.debtAmountUsd > 0) {
            RiskEngine.EvaluationResult memory eval = riskEngine.evaluatePosition(
                asset,
                remainingRaw,
                pos.debtAmountUsd
            );

            if (eval.status == RiskEngine.PositionStatus.BLOCKED) revert AssetBlocked();
            if (eval.status == RiskEngine.PositionStatus.STALE_ORACLE) revert OracleStale();
            if (!eval.isHealthy) revert UnhealthyPositionAfterAction(eval.healthFactor);
        }

        // Update state
        _updatePosition(msg.sender, asset, remainingRaw, pos.debtAmountUsd);

        // Transfer raw tokens back to user
        _safeTransfer(asset, msg.sender, rawAmount);

        emit Withdrawn(msg.sender, asset, rawAmount, remainingRaw);
    }

    /**
     * @notice Liquidate an under-collateralized position
     * @dev Re-derives live multiplier and valuation before allowing liquidation
     * @param borrower Target borrower address
     * @param asset Collateral asset backing the position
     * @param debtToRepayUsd Amount of debt to liquidate in USD WAD
     */
    function liquidate(
        address borrower,
        address asset,
        uint256 debtToRepayUsd
    ) external nonReentrant {
        if (debtToRepayUsd == 0) revert ZeroAmount();

        Position memory pos = _positions[borrower][asset];
        if (pos.debtAmountUsd == 0) revert PositionHealthy();

        // 1. Live evaluation
        RiskEngine.EvaluationResult memory eval = riskEngine.evaluatePosition(
            asset,
            pos.rawCollateral,
            pos.debtAmountUsd
        );

        if (!eval.isLiquidatable) revert PositionHealthy();

        // Cap repayment to total debt
        if (debtToRepayUsd > pos.debtAmountUsd) {
            debtToRepayUsd = pos.debtAmountUsd;
        }

        (
            ,
            ,
            ,
            uint16 liquidationPenaltyBps,
            ,
            ,
            ,
        ) = riskEngine.assetConfigs(asset);

        // 2. Calculate collateral to seize
        (uint256 rawCollateralToSeize, uint256 uiCollateralSeized) = PositionMath.calculateLiquidationCollateral(
            debtToRepayUsd,
            eval.oraclePrice,
            eval.oracleDecimals,
            eval.assetDecimals,
            liquidationPenaltyBps,
            eval.effectiveMultiplier
        );

        // Cap seized collateral to available balance
        if (rawCollateralToSeize > pos.rawCollateral) {
            rawCollateralToSeize = pos.rawCollateral;
        }

        // 3. Collect debt repayment from liquidator
        uint8 debtDecimals = debtToken.decimals();
        uint256 transferAmount = PositionMath.denormalizeFromWad(debtToRepayUsd, debtDecimals);
        _safeTransferFrom(address(debtToken), msg.sender, address(this), transferAmount);

        // 4. Update borrower position
        uint256 remainingRaw = pos.rawCollateral - rawCollateralToSeize;
        uint256 remainingDebt = pos.debtAmountUsd - debtToRepayUsd;
        _updatePosition(borrower, asset, remainingRaw, remainingDebt);

        // 5. Transfer seized raw tokens to liquidator
        _safeTransfer(asset, msg.sender, rawCollateralToSeize);

        emit Liquidated(
            msg.sender,
            borrower,
            asset,
            debtToRepayUsd,
            rawCollateralToSeize,
            uiCollateralSeized
        );
    }

    /**
     * @notice Inspect live position diagnostics for any user and asset
     */
    function inspectPosition(address user, address asset) external view returns (
        RiskEngine.EvaluationResult memory eval,
        Position memory pos
    ) {
        pos = _positions[user][asset];
        eval = riskEngine.evaluatePosition(asset, pos.rawCollateral, pos.debtAmountUsd);
    }

    // --- Internal Safe Transfer Helpers ---

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }
}

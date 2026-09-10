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
 * @dev Enforces Valuation-Basis Integrity:
 *      canonicalCollateralUSD = rawTokenAmount * totalReturnPrice
 *      NEVER compounds B20 multiplier into Total Return Value price.
 */
contract EQUIVANCEVault is EQUIVANCEPosition {
    using PositionMath for uint256;

    uint256 public constant WAD = 1e18;

    RiskEngine public immutable riskEngine;
    B20StateReader public immutable stateReader;
    IERC20 public immutable debtToken; // e.g. USDC (scaled to 18 decimals internally)
    address public owner;

    bool private _locked;

    event Deposited(address indexed user, address indexed asset, uint256 rawTokenAmount, uint256 effectiveMultiplier);
    event Borrowed(address indexed user, address indexed asset, uint256 borrowAmountUsdWad, uint256 totalDebtUsdWad);
    event Repaid(address indexed user, address indexed asset, uint256 repayAmountUsdWad, uint256 remainingDebtUsdWad);
    event Withdrawn(address indexed user, address indexed asset, uint256 rawTokenAmount, uint256 remainingRawTokenAmount);
    event Liquidated(
        address indexed liquidator,
        address indexed borrower,
        address indexed asset,
        uint256 debtRepaidUsdWad,
        uint256 rawCollateralSeized
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
     * @param rawTokenAmount Unscaled token units to deposit
     */
    function deposit(address asset, uint256 rawTokenAmount) public nonReentrant {
        if (rawTokenAmount == 0) revert ZeroAmount();

        Position memory pos = _positions[msg.sender][asset];
        uint256 newRawCollateral = pos.rawCollateral + rawTokenAmount;

        // Perform safe transfer from user to vault
        _safeTransferFrom(asset, msg.sender, address(this), rawTokenAmount);

        // Update internal accounting
        _updatePosition(msg.sender, asset, newRawCollateral, pos.debtAmountUsd);

        // Inspect live state for event logging
        B20StateReader.B20State memory b20State = stateReader.getB20State(asset, address(this));
        emit Deposited(msg.sender, asset, rawTokenAmount, b20State.effectiveMultiplier);
    }

    /**
     * @notice Add collateral (alias for deposit)
     */
    function addCollateral(address asset, uint256 rawTokenAmount) external {
        deposit(asset, rawTokenAmount);
    }

    /**
     * @notice Borrow stablecoin against deposited B20 collateral
     * @dev Re-derives collateral valuation dynamically from current block timestamp
     * @param asset Collateral asset backing the borrow
     * @param borrowAmountUsdWad Desired debt amount in 18-decimal USD WAD
     */
    function borrow(address asset, uint256 borrowAmountUsdWad) external nonReentrant {
        if (borrowAmountUsdWad == 0) revert ZeroAmount();

        Position memory pos = _positions[msg.sender][asset];
        uint256 newDebt = pos.debtAmountUsd + borrowAmountUsdWad;

        // Canonical live risk evaluation at CURRENT block timestamp
        RiskEngine.EvaluationResult memory eval = riskEngine.evaluatePosition(
            asset,
            pos.rawCollateral,
            newDebt
        );

        if (eval.status == RiskEngine.PositionStatus.BLOCKED) revert AssetBlocked();
        if (eval.status == RiskEngine.PositionStatus.STALE_ORACLE) revert OracleStale();
        if (newDebt > eval.maxDebtUsdWad) revert InsufficientCollateral(newDebt, eval.maxDebtUsdWad);
        if (!eval.isHealthy) revert UnhealthyPositionAfterAction(eval.healthFactor);

        // Update state
        _updatePosition(msg.sender, asset, pos.rawCollateral, newDebt);

        // Transfer debt token (denormalized if token has non-18 decimals)
        uint8 debtDecimals = debtToken.decimals();
        uint256 transferAmount = PositionMath.denormalizeFromWad(borrowAmountUsdWad, debtDecimals);
        _safeTransfer(address(debtToken), msg.sender, transferAmount);

        emit Borrowed(msg.sender, asset, borrowAmountUsdWad, newDebt);
    }

    /**
     * @notice Repay outstanding debt
     * @param asset Collateral asset backing the debt
     * @param repayAmountUsdWad Debt amount to repay in 18-decimal USD WAD
     */
    function repay(address asset, uint256 repayAmountUsdWad) external nonReentrant {
        if (repayAmountUsdWad == 0) revert ZeroAmount();

        Position memory pos = _positions[msg.sender][asset];
        if (repayAmountUsdWad > pos.debtAmountUsd) {
            repayAmountUsdWad = pos.debtAmountUsd;
        }

        uint256 remainingDebt = pos.debtAmountUsd - repayAmountUsdWad;

        // Transfer debt token from user to vault
        uint8 debtDecimals = debtToken.decimals();
        uint256 transferAmount = PositionMath.denormalizeFromWad(repayAmountUsdWad, debtDecimals);
        _safeTransferFrom(address(debtToken), msg.sender, address(this), transferAmount);

        // Update state
        _updatePosition(msg.sender, asset, pos.rawCollateral, remainingDebt);

        emit Repaid(msg.sender, asset, repayAmountUsdWad, remainingDebt);
    }

    /**
     * @notice Withdraw raw B20 token collateral
     * @dev Re-evaluates remaining position to guarantee health factor >= 1.0e18
     * @param asset Collateral asset to withdraw
     * @param rawTokenAmount Unscaled token units to withdraw
     */
    function withdraw(address asset, uint256 rawTokenAmount) external nonReentrant {
        if (rawTokenAmount == 0) revert ZeroAmount();

        Position memory pos = _positions[msg.sender][asset];
        require(rawTokenAmount <= pos.rawCollateral, "Exceeds deposited balance");

        uint256 remainingRaw = pos.rawCollateral - rawTokenAmount;

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
        _safeTransfer(asset, msg.sender, rawTokenAmount);

        emit Withdrawn(msg.sender, asset, rawTokenAmount, remainingRaw);
    }

    /**
     * @notice Liquidate an under-collateralized position
     * @param borrower Target borrower address
     * @param asset Collateral asset backing the position
     * @param debtToRepayUsdWad Amount of debt to liquidate in USD WAD
     */
    function liquidate(
        address borrower,
        address asset,
        uint256 debtToRepayUsdWad
    ) external nonReentrant {
        if (debtToRepayUsdWad == 0) revert ZeroAmount();

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
        if (debtToRepayUsdWad > pos.debtAmountUsd) {
            debtToRepayUsdWad = pos.debtAmountUsd;
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

        // 2. Calculate collateral to seize (raw units under TRV pricing)
        uint256 rawCollateralToSeize = PositionMath.calculateLiquidationCollateral(
            debtToRepayUsdWad,
            eval.totalReturnPrice8,
            eval.oracleDecimals,
            eval.assetDecimals,
            liquidationPenaltyBps
        );

        // Cap seized collateral to available balance
        if (rawCollateralToSeize > pos.rawCollateral) {
            rawCollateralToSeize = pos.rawCollateral;
        }

        // 3. Collect debt repayment from liquidator
        uint8 debtDecimals = debtToken.decimals();
        uint256 transferAmount = PositionMath.denormalizeFromWad(debtToRepayUsdWad, debtDecimals);
        _safeTransferFrom(address(debtToken), msg.sender, address(this), transferAmount);

        // 4. Update borrower position
        uint256 remainingRaw = pos.rawCollateral - rawCollateralToSeize;
        uint256 remainingDebt = pos.debtAmountUsd - debtToRepayUsdWad;
        _updatePosition(borrower, asset, remainingRaw, remainingDebt);

        // 5. Transfer seized raw tokens to liquidator
        _safeTransfer(asset, msg.sender, rawCollateralToSeize);

        emit Liquidated(
            msg.sender,
            borrower,
            asset,
            debtToRepayUsdWad,
            rawCollateralToSeize
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

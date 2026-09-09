// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IERC20.sol";
import "../interfaces/IAggregatorV3.sol";
import "../PositionMath.sol";

/**
 * @title NaiveVault
 * @notice Deliberately flawed baseline vault implementation relying on cached event multiplier
 * @dev Used for benchmark comparison to demonstrate catastrophic bad debt / wrongful liquidation failure modes
 */
contract NaiveVault {
    using PositionMath for uint256;

    uint256 public constant WAD = 1e18;
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct NaivePosition {
        uint256 rawCollateral;
        uint256 debtAmountUsd;
    }

    IERC20 public immutable debtToken;
    IAggregatorV3 public priceFeed;
    uint16 public ltvBps;
    uint16 public liquidationThresholdBps;

    // The fatal flaw: cached multiplier set from historical event and never re-evaluated lazily
    uint256 public cachedMultiplier;

    mapping(address => mapping(address => NaivePosition)) public positions;

    event CachedMultiplierUpdated(uint256 newCachedMultiplier);
    event Deposited(address indexed user, uint256 rawAmount);
    event Borrowed(address indexed user, uint256 borrowAmountUsd);

    constructor(
        address _debtToken,
        address _priceFeed,
        uint16 _ltvBps,
        uint16 _liqThresholdBps
    ) {
        debtToken = IERC20(_debtToken);
        priceFeed = IAggregatorV3(_priceFeed);
        ltvBps = _ltvBps;
        liquidationThresholdBps = _liqThresholdBps;
        cachedMultiplier = WAD; // Default 1.0x
    }

    /// @notice Update cached multiplier from an indexer/event
    function updateCachedMultiplierFromEvent(uint256 newMultiplier) external {
        cachedMultiplier = newMultiplier;
        emit CachedMultiplierUpdated(newMultiplier);
    }

    function deposit(address asset, uint256 rawAmount) external {
        require(rawAmount > 0, "Zero amount");
        IERC20(asset).transferFrom(msg.sender, address(this), rawAmount);
        positions[msg.sender][asset].rawCollateral += rawAmount;
        emit Deposited(msg.sender, rawAmount);
    }

    /**
     * @notice Flawed borrow function relying on cached multiplier rather than live uiMultiplier()
     */
    function borrow(address asset, uint256 borrowAmountUsd) external {
        NaivePosition storage pos = positions[msg.sender][asset];
        uint256 newDebt = pos.debtAmountUsd + borrowAmountUsd;

        // Naive valuation using stale cached multiplier!
        uint256 uiAmount = (pos.rawCollateral * cachedMultiplier) / WAD;
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        uint8 oracleDecimals = priceFeed.decimals();
        uint8 assetDecimals = IERC20(asset).decimals();

        uint256 collateralValueUsd = PositionMath.calculateCollateralValue(
            uiAmount,
            uint256(price),
            oracleDecimals,
            assetDecimals
        );

        uint256 maxDebtUsd = (collateralValueUsd * ltvBps) / BPS_DENOMINATOR;
        require(newDebt <= maxDebtUsd, "NaiveVault: Exceeds borrowing limit");

        pos.debtAmountUsd = newDebt;
        uint8 debtDecimals = debtToken.decimals();
        uint256 transferAmount = PositionMath.denormalizeFromWad(borrowAmountUsd, debtDecimals);
        debtToken.transfer(msg.sender, transferAmount);

        emit Borrowed(msg.sender, borrowAmountUsd);
    }

    function inspectNaivePosition(address user, address asset) external view returns (
        uint256 rawCollateral,
        uint256 cachedMultiplierUsed,
        uint256 evaluatedUiCollateral,
        uint256 collateralValueUsd,
        uint256 maxDebtUsd,
        uint256 debtAmountUsd,
        uint256 healthFactor
    ) {
        NaivePosition memory pos = positions[user][asset];
        rawCollateral = pos.rawCollateral;
        cachedMultiplierUsed = cachedMultiplier;
        evaluatedUiCollateral = (rawCollateral * cachedMultiplier) / WAD;

        (, int256 price, , , ) = priceFeed.latestRoundData();
        uint8 oracleDecimals = priceFeed.decimals();
        uint8 assetDecimals = IERC20(asset).decimals();

        collateralValueUsd = PositionMath.calculateCollateralValue(
            evaluatedUiCollateral,
            uint256(price),
            oracleDecimals,
            assetDecimals
        );
        maxDebtUsd = (collateralValueUsd * ltvBps) / BPS_DENOMINATOR;
        debtAmountUsd = pos.debtAmountUsd;
        healthFactor = PositionMath.calculateHealthFactor(collateralValueUsd, liquidationThresholdBps, debtAmountUsd);
    }
}

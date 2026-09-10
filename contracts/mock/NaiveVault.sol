// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IERC20.sol";
import "../interfaces/IAggregatorV3.sol";
import "../PositionMath.sol";

/**
 * @title NaiveVault
 * @notice Deliberately flawed baseline vault compounding B20 multiplier into Total Return Price
 * @dev Valuation flaw: naiveCollateralUSD = rawTokenAmount * multiplier * totalReturnPrice
 *      Demonstrates the exact value divergence and catastrophic over-borrowing caused by double-adjustment.
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

    // Multiplier applied by naive vault (either read from B20 or cached from events)
    uint256 public activeMultiplier;

    mapping(address => mapping(address => NaivePosition)) public positions;

    event MultiplierUpdated(uint256 newMultiplier);
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
        activeMultiplier = WAD; // Default 1.0x
    }

    /// @notice Update multiplier
    function setMultiplier(uint256 newMultiplier) external {
        activeMultiplier = newMultiplier;
        emit MultiplierUpdated(newMultiplier);
    }

    function deposit(address asset, uint256 rawAmount) external {
        require(rawAmount > 0, "Zero amount");
        IERC20(asset).transferFrom(msg.sender, address(this), rawAmount);
        positions[msg.sender][asset].rawCollateral += rawAmount;
        emit Deposited(msg.sender, rawAmount);
    }

    /**
     * @notice Flawed borrow function compounding multiplier into Total Return Price
     */
    function borrow(address asset, uint256 borrowAmountUsd) external {
        NaivePosition storage pos = positions[msg.sender][asset];
        uint256 newDebt = pos.debtAmountUsd + borrowAmountUsd;

        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        uint8 oracleDecimals = priceFeed.decimals();
        uint8 assetDecimals = IERC20(asset).decimals();

        // The Fatal Flaw: Multiplies multiplier into Total Return Price!
        uint256 naiveDoubleAdjustedUsd = PositionMath.calculateNaiveDoubleAdjustedUSD(
            pos.rawCollateral,
            uint256(price),
            activeMultiplier,
            oracleDecimals,
            assetDecimals
        );

        uint256 maxDebtUsd = (naiveDoubleAdjustedUsd * ltvBps) / BPS_DENOMINATOR;
        require(newDebt <= maxDebtUsd, "NaiveVault: Exceeds borrowing limit");

        pos.debtAmountUsd = newDebt;
        uint8 debtDecimals = debtToken.decimals();
        uint256 transferAmount = PositionMath.denormalizeFromWad(borrowAmountUsd, debtDecimals);
        debtToken.transfer(msg.sender, transferAmount);

        emit Borrowed(msg.sender, borrowAmountUsd);
    }

    function inspectNaivePosition(address user, address asset) external view returns (
        uint256 rawCollateral,
        uint256 multiplierUsed,
        uint256 canonicalCollateralUsd,
        uint256 naiveDoubleAdjustedUsd,
        uint256 divergenceBps,
        uint256 maxDebtUsd,
        uint256 debtAmountUsd,
        uint256 healthFactor
    ) {
        NaivePosition memory pos = positions[user][asset];
        rawCollateral = pos.rawCollateral;
        multiplierUsed = activeMultiplier;

        (, int256 price, , , ) = priceFeed.latestRoundData();
        uint8 oracleDecimals = priceFeed.decimals();
        uint8 assetDecimals = IERC20(asset).decimals();

        canonicalCollateralUsd = PositionMath.valueCollateral(
            rawCollateral,
            uint256(price),
            oracleDecimals,
            assetDecimals
        );

        naiveDoubleAdjustedUsd = PositionMath.calculateNaiveDoubleAdjustedUSD(
            rawCollateral,
            uint256(price),
            activeMultiplier,
            oracleDecimals,
            assetDecimals
        );

        if (canonicalCollateralUsd > 0) {
            if (naiveDoubleAdjustedUsd > canonicalCollateralUsd) {
                divergenceBps = ((naiveDoubleAdjustedUsd - canonicalCollateralUsd) * 10000) / canonicalCollateralUsd;
            } else {
                divergenceBps = ((canonicalCollateralUsd - naiveDoubleAdjustedUsd) * 10000) / canonicalCollateralUsd;
            }
        }

        maxDebtUsd = (naiveDoubleAdjustedUsd * ltvBps) / BPS_DENOMINATOR;
        debtAmountUsd = pos.debtAmountUsd;
        healthFactor = PositionMath.calculateHealthFactor(naiveDoubleAdjustedUsd, liquidationThresholdBps, debtAmountUsd);
    }
}

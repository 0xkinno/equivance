// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../PositionMath.sol";

contract PositionMathHarness {
    function toUIShareAmount(uint256 rawTokenAmount, uint256 uiMultiplierWad) external pure returns (uint256) {
        return PositionMath.toUIShareAmount(rawTokenAmount, uiMultiplierWad);
    }

    function toRawTokenAmount(uint256 uiShareAmount, uint256 uiMultiplierWad) external pure returns (uint256) {
        return PositionMath.toRawTokenAmount(uiShareAmount, uiMultiplierWad);
    }

    function valueCollateral(
        uint256 rawTokenAmount,
        uint256 totalReturnPrice8,
        uint8 oracleDecimals,
        uint8 assetDecimals
    ) external pure returns (uint256) {
        return PositionMath.valueCollateral(rawTokenAmount, totalReturnPrice8, oracleDecimals, assetDecimals);
    }

    function calculateNaiveDoubleAdjustedUSD(
        uint256 rawTokenAmount,
        uint256 totalReturnPrice8,
        uint256 uiMultiplierWad,
        uint8 oracleDecimals,
        uint8 assetDecimals
    ) external pure returns (uint256) {
        return PositionMath.calculateNaiveDoubleAdjustedUSD(rawTokenAmount, totalReturnPrice8, uiMultiplierWad, oracleDecimals, assetDecimals);
    }

    function calculateMaxDebt(uint256 collateralUsdWad, uint256 ltvBps) external pure returns (uint256) {
        return PositionMath.calculateMaxDebt(collateralUsdWad, ltvBps);
    }

    function calculateHealthFactor(
        uint256 collateralUsdWad,
        uint256 liquidationThresholdBps,
        uint256 totalDebtUsdWad
    ) external pure returns (uint256) {
        return PositionMath.calculateHealthFactor(collateralUsdWad, liquidationThresholdBps, totalDebtUsdWad);
    }

    function calculateLiquidationCollateral(
        uint256 debtToRepayUsdWad,
        uint256 totalReturnPrice8,
        uint8 oracleDecimals,
        uint8 assetDecimals,
        uint256 liquidationPenaltyBps
    ) external pure returns (uint256) {
        return PositionMath.calculateLiquidationCollateral(
            debtToRepayUsdWad,
            totalReturnPrice8,
            oracleDecimals,
            assetDecimals,
            liquidationPenaltyBps
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../PositionMath.sol";

contract PositionMathHarness {
    function toUIAmount(uint256 rawAmount, uint256 multiplier) external pure returns (uint256) {
        return PositionMath.toUIAmount(rawAmount, multiplier);
    }

    function toRawAmount(uint256 uiAmount, uint256 multiplier) external pure returns (uint256) {
        return PositionMath.toRawAmount(uiAmount, multiplier);
    }

    function calculateCollateralValue(
        uint256 uiAmount,
        uint256 price,
        uint8 oracleDecimals,
        uint8 assetDecimals
    ) external pure returns (uint256) {
        return PositionMath.calculateCollateralValue(uiAmount, price, oracleDecimals, assetDecimals);
    }

    function calculateMaxDebt(uint256 collateralValueUsd, uint256 ltvBps) external pure returns (uint256) {
        return PositionMath.calculateMaxDebt(collateralValueUsd, ltvBps);
    }

    function calculateHealthFactor(
        uint256 collateralValueUsd,
        uint256 liquidationThresholdBps,
        uint256 totalDebtUsd
    ) external pure returns (uint256) {
        return PositionMath.calculateHealthFactor(collateralValueUsd, liquidationThresholdBps, totalDebtUsd);
    }

    function calculateLiquidationCollateral(
        uint256 debtToRepayUsd,
        uint256 price,
        uint8 oracleDecimals,
        uint8 assetDecimals,
        uint256 liquidationPenaltyBps,
        uint256 multiplier
    ) external pure returns (uint256, uint256) {
        return PositionMath.calculateLiquidationCollateral(
            debtToRepayUsd,
            price,
            oracleDecimals,
            assetDecimals,
            liquidationPenaltyBps,
            multiplier
        );
    }
}

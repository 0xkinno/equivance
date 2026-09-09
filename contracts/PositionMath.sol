// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PositionMath
 * @notice Stateless, pure fixed-point arithmetic library for B20 equity credit valuation
 * @dev All values normalized to 18-decimal WAD standard unless specified otherwise.
 * Rounding policy:
 * - Collateral valuation rounds DOWN (solvency favorable)
 * - Debt computation rounds UP
 * - Multiplier conversions use explicit 1e18 scaling
 */
library PositionMath {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant BPS_DENOMINATOR = 10000;

    error DivisionByZero();
    error InvalidMultiplier();
    error DecimalsOutOfBounds();

    /**
     * @notice Converts raw ERC-20 token amount to scaled UI amount
     * @param rawAmount Unscaled token balance from balanceOf()
     * @param multiplier Current effective multiplier in WAD (1e18 = 1.0x)
     * @return uiAmount Scaled share-equivalent amount in token's native decimals
     */
    function toUIAmount(uint256 rawAmount, uint256 multiplier) internal pure returns (uint256 uiAmount) {
        if (multiplier == 0) revert InvalidMultiplier();
        uiAmount = (rawAmount * multiplier) / WAD;
    }

    /**
     * @notice Converts scaled UI amount back to raw ERC-20 token amount
     * @param uiAmount Scaled share-equivalent amount
     * @param multiplier Current effective multiplier in WAD (1e18 = 1.0x)
     * @return rawAmount Raw token balance
     */
    function toRawAmount(uint256 uiAmount, uint256 multiplier) internal pure returns (uint256 rawAmount) {
        if (multiplier == 0) revert InvalidMultiplier();
        rawAmount = (uiAmount * WAD) / multiplier;
    }

    /**
     * @notice Normalizes an amount from native asset decimals to 18-decimal WAD
     */
    function normalizeToWad(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        if (decimals == 18) {
            return amount;
        } else if (decimals < 18) {
            return amount * (10 ** (18 - decimals));
        } else {
            return amount / (10 ** (decimals - 18));
        }
    }

    /**
     * @notice Denormalizes a 18-decimal WAD amount to native asset decimals
     */
    function denormalizeFromWad(uint256 wadAmount, uint8 decimals) internal pure returns (uint256) {
        if (decimals == 18) {
            return wadAmount;
        } else if (decimals < 18) {
            return wadAmount / (10 ** (18 - decimals));
        } else {
            return wadAmount * (10 ** (decimals - 18));
        }
    }

    /**
     * @notice Computes total collateral valuation in 18-decimal USD WAD
     * @param uiAmount Effective UI share-equivalent amount (native token decimals)
     * @param price Current equity oracle price
     * @param oracleDecimals Decimals of oracle price (typically 8 for Chainlink USD feeds)
     * @param assetDecimals Decimals of the tokenized asset (typically 18)
     * @return collateralValueUsd Total collateral value in 18-decimal USD WAD
     */
    function calculateCollateralValue(
        uint256 uiAmount,
        uint256 price,
        uint8 oracleDecimals,
        uint8 assetDecimals
    ) internal pure returns (uint256 collateralValueUsd) {
        if (uiAmount == 0 || price == 0) return 0;
        uint256 normalizedUi = normalizeToWad(uiAmount, assetDecimals);
        uint256 normalizedPrice = normalizeToWad(price, oracleDecimals);

        // Result is in WAD: (1e18 * 1e18) / 1e18 = 1e18
        collateralValueUsd = (normalizedUi * normalizedPrice) / WAD;
    }

    /**
     * @notice Computes maximum safe borrowing capacity given LTV
     * @param collateralValueUsd Collateral value in 18-decimal USD WAD
     * @param ltvBps Loan-to-Value in basis points (e.g. 7500 for 75%)
     * @return maxDebtUsd Maximum allowable debt in 18-decimal USD WAD
     */
    function calculateMaxDebt(uint256 collateralValueUsd, uint256 ltvBps) internal pure returns (uint256 maxDebtUsd) {
        maxDebtUsd = (collateralValueUsd * ltvBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Computes position health factor in WAD (1e18 = 100% threshold)
     * @param collateralValueUsd Collateral value in 18-decimal USD WAD
     * @param liquidationThresholdBps Liquidation threshold in BPS (e.g. 8500 = 85%)
     * @param totalDebtUsd Outstanding debt in 18-decimal USD WAD
     * @return healthFactor Health ratio (1e18 = liquidation boundary, >1e18 = healthy)
     */
    function calculateHealthFactor(
        uint256 collateralValueUsd,
        uint256 liquidationThresholdBps,
        uint256 totalDebtUsd
    ) internal pure returns (uint256 healthFactor) {
        if (totalDebtUsd == 0) {
            return type(uint256).max;
        }
        uint256 liquidationCollateral = (collateralValueUsd * liquidationThresholdBps) / BPS_DENOMINATOR;
        healthFactor = (liquidationCollateral * WAD) / totalDebtUsd;
    }

    /**
     * @notice Calculates required collateral to seize during liquidation
     * @param debtToRepayUsd Amount of debt being liquidated in USD WAD
     * @param price Current equity oracle price
     * @param oracleDecimals Oracle decimals
     * @param assetDecimals Asset decimals
     * @param liquidationPenaltyBps Liquidation bonus/penalty BPS (e.g. 500 = 5%)
     * @param multiplier Current effective multiplier in WAD
     * @return rawCollateralToSeize Amount of raw B20 tokens to transfer to liquidator
     * @return uiCollateralSeized Amount of UI share-equivalent seized
     */
    function calculateLiquidationCollateral(
        uint256 debtToRepayUsd,
        uint256 price,
        uint8 oracleDecimals,
        uint8 assetDecimals,
        uint256 liquidationPenaltyBps,
        uint256 multiplier
    ) internal pure returns (uint256 rawCollateralToSeize, uint256 uiCollateralSeized) {
        if (price == 0) revert DivisionByZero();
        if (multiplier == 0) revert InvalidMultiplier();

        uint256 normalizedPrice = normalizeToWad(price, oracleDecimals);
        uint256 valueWithBonus = (debtToRepayUsd * (BPS_DENOMINATOR + liquidationPenaltyBps)) / BPS_DENOMINATOR;

        // UI amount in WAD: (valueWithBonus * 1e18) / normalizedPrice
        uint256 uiAmountWad = (valueWithBonus * WAD) / normalizedPrice;
        uiCollateralSeized = denormalizeFromWad(uiAmountWad, assetDecimals);

        // Convert UI amount to raw token units
        rawCollateralToSeize = toRawAmount(uiCollateralSeized, multiplier);
    }
}

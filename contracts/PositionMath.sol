// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PositionMath
 * @notice Stateless, pure fixed-point arithmetic library for B20 equity credit valuation
 * @dev Enforces valuation-basis integrity:
 * 
 * CORE VALUATION INVARIANT:
 * 1. For Coinbase Tokenized-Stock Total Return Value (TRV) Feeds:
 *      canonicalCollateralUSD = rawTokenAmount * totalReturnPrice
 *    The B20 multiplier is NEVER multiplied into totalReturnPrice (which would double-compound corporate actions).
 * 
 * 2. For Decomposed Underlying Pricing (non-TRV):
 *      decomposedCollateralUSD = rawTokenAmount * underlyingPrice * uiMultiplier
 * 
 * 3. The B20 multiplier is used separately for:
 *    - UI / share-equivalent reporting (uiShareAmount = rawTokenAmount * multiplier / 1e18)
 *    - Transition inspection and consistency verification
 * 
 * Rounding policy:
 * - Collateral valuation rounds DOWN (solvency favorable)
 * - Debt computation rounds UP
 */
library PositionMath {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant BPS_DENOMINATOR = 10000;

    error DivisionByZero();
    error InvalidMultiplier();

    /**
     * @notice Converts raw ERC-20 token amount to scaled UI / share-equivalent representation
     * @dev Used for UI presentation, share counting, and sanity assertions ONLY. NEVER used in total-return valuation.
     * @param rawTokenAmount Raw unscaled token balance from balanceOf()
     * @param uiMultiplierWad Current effective multiplier in WAD (1e18 = 1.0x)
     * @return uiShareAmount Scaled share-equivalent amount in token's native decimals
     */
    function toUIShareAmount(uint256 rawTokenAmount, uint256 uiMultiplierWad) internal pure returns (uint256 uiShareAmount) {
        if (uiMultiplierWad == 0) revert InvalidMultiplier();
        uiShareAmount = (rawTokenAmount * uiMultiplierWad) / WAD;
    }

    /**
     * @notice Converts UI share amount back to raw token amount
     * @param uiShareAmount Scaled share-equivalent amount
     * @param uiMultiplierWad Current effective multiplier in WAD (1e18 = 1.0x)
     * @return rawTokenAmount Raw token balance
     */
    function toRawTokenAmount(uint256 uiShareAmount, uint256 uiMultiplierWad) internal pure returns (uint256 rawTokenAmount) {
        if (uiMultiplierWad == 0) revert InvalidMultiplier();
        rawTokenAmount = (uiShareAmount * WAD) / uiMultiplierWad;
    }

    /**
     * @notice Normalizes an amount from native token decimals to 18-decimal WAD
     */
    function normalizeToWad(uint256 tokenAmount, uint8 tokenDecimals) internal pure returns (uint256) {
        if (tokenDecimals == 18) {
            return tokenAmount;
        } else if (tokenDecimals < 18) {
            return tokenAmount * (10 ** (18 - tokenDecimals));
        } else {
            return tokenAmount / (10 ** (tokenDecimals - 18));
        }
    }

    /**
     * @notice Denormalizes an 18-decimal WAD amount to native token decimals
     */
    function denormalizeFromWad(uint256 wadAmount, uint8 tokenDecimals) internal pure returns (uint256) {
        if (tokenDecimals == 18) {
            return wadAmount;
        } else if (tokenDecimals < 18) {
            return wadAmount / (10 ** (18 - tokenDecimals));
        } else {
            return wadAmount * (10 ** (tokenDecimals - 18));
        }
    }

    /**
     * @notice Canonical Collateral Valuation for Coinbase Total Return Value (TRV) Feeds
     * @dev Rule: canonicalCollateralUSD = rawTokenAmount * totalReturnPrice
     * NEVER multiplies uiMultiplier into totalReturnPrice.
     * @param rawTokenAmount Raw B20 token units from balanceOf()
     * @param totalReturnPrice8 Oracle total return price (typically 8 decimals)
     * @param oracleDecimals Price oracle decimals (e.g. 8)
     * @param assetDecimals Raw token decimals (e.g. 18)
     * @return collateralUsdWad Normalized collateral valuation in 18-decimal USD WAD
     */
    function valueCollateral(
        uint256 rawTokenAmount,
        uint256 totalReturnPrice8,
        uint8 oracleDecimals,
        uint8 assetDecimals
    ) internal pure returns (uint256 collateralUsdWad) {
        if (rawTokenAmount == 0 || totalReturnPrice8 == 0) return 0;
        uint256 normalizedRaw = normalizeToWad(rawTokenAmount, assetDecimals);
        uint256 normalizedPrice = normalizeToWad(totalReturnPrice8, oracleDecimals);

        // Result is in WAD: (1e18 * 1e18) / 1e18 = 1e18
        collateralUsdWad = (normalizedRaw * normalizedPrice) / WAD;
    }

    /**
     * @notice Decomposed Collateral Valuation (only used when pricing raw underlying equity with external multiplier)
     * @dev Rule: rawTokenAmount * underlyingPrice * uiMultiplier
     */
    function calculateDecomposedCollateralUSD(
        uint256 rawTokenAmount,
        uint256 underlyingPrice8,
        uint256 uiMultiplierWad,
        uint8 oracleDecimals,
        uint8 assetDecimals
    ) internal pure returns (uint256 decomposedCollateralUsdWad) {
        if (rawTokenAmount == 0 || underlyingPrice8 == 0 || uiMultiplierWad == 0) return 0;
        uint256 normalizedRaw = normalizeToWad(rawTokenAmount, assetDecimals);
        uint256 normalizedPrice = normalizeToWad(underlyingPrice8, oracleDecimals);
        uint256 rawValuation = (normalizedRaw * normalizedPrice) / WAD;
        decomposedCollateralUsdWad = (rawValuation * uiMultiplierWad) / WAD;
    }

    /**
     * @notice Naive (Flawed) Valuation for baseline and attack demonstration
     * @dev Flaw: compounds multiplier into Total Return Price -> raw * multiplier * TRV
     */
    function calculateNaiveDoubleAdjustedUSD(
        uint256 rawTokenAmount,
        uint256 totalReturnPrice8,
        uint256 uiMultiplierWad,
        uint8 oracleDecimals,
        uint8 assetDecimals
    ) internal pure returns (uint256 naiveDoubleAdjustedUsdWad) {
        uint256 canonical = valueCollateral(rawTokenAmount, totalReturnPrice8, oracleDecimals, assetDecimals);
        if (uiMultiplierWad == 0) return canonical;
        naiveDoubleAdjustedUsdWad = (canonical * uiMultiplierWad) / WAD;
    }

    /**
     * @notice Computes maximum safe borrowing capacity given LTV
     * @param collateralUsdWad Collateral value in 18-decimal USD WAD
     * @param ltvBps Loan-to-Value in basis points (e.g. 7500 for 75%)
     * @return maxDebtUsdWad Maximum allowable debt in 18-decimal USD WAD
     */
    function calculateMaxDebt(uint256 collateralUsdWad, uint256 ltvBps) internal pure returns (uint256 maxDebtUsdWad) {
        maxDebtUsdWad = (collateralUsdWad * ltvBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Computes position health factor in WAD (1e18 = 100% threshold)
     * @param collateralUsdWad Collateral value in 18-decimal USD WAD
     * @param liquidationThresholdBps Liquidation threshold in BPS (e.g. 8500 = 85%)
     * @param totalDebtUsdWad Outstanding debt in 18-decimal USD WAD
     * @return healthFactorWad Health ratio (1e18 = liquidation boundary, >1e18 = healthy)
     */
    function calculateHealthFactor(
        uint256 collateralUsdWad,
        uint256 liquidationThresholdBps,
        uint256 totalDebtUsdWad
    ) internal pure returns (uint256 healthFactorWad) {
        if (totalDebtUsdWad == 0) {
            return type(uint256).max;
        }
        uint256 liquidationCollateral = (collateralUsdWad * liquidationThresholdBps) / BPS_DENOMINATOR;
        healthFactorWad = (liquidationCollateral * WAD) / totalDebtUsdWad;
    }

    /**
     * @notice Calculates required raw collateral to seize during liquidation
     * @dev Under TRV pricing: rawToSeize = debtWithBonus / totalReturnPrice
     */
    function calculateLiquidationCollateral(
        uint256 debtToRepayUsdWad,
        uint256 totalReturnPrice8,
        uint8 oracleDecimals,
        uint8 assetDecimals,
        uint256 liquidationPenaltyBps
    ) internal pure returns (uint256 rawTokenToSeize) {
        if (totalReturnPrice8 == 0) revert DivisionByZero();
        uint256 normalizedPrice = normalizeToWad(totalReturnPrice8, oracleDecimals);
        uint256 valueWithBonus = (debtToRepayUsdWad * (BPS_DENOMINATOR + liquidationPenaltyBps)) / BPS_DENOMINATOR;

        // Raw amount in WAD: (valueWithBonus * 1e18) / normalizedPrice
        uint256 rawWad = (valueWithBonus * WAD) / normalizedPrice;
        rawTokenToSeize = denormalizeFromWad(rawWad, assetDecimals);
    }
}

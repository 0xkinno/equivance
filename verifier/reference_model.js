const WAD = 10n ** 18n;
const BPS_DENOMINATOR = 10000n;

function normalizeToWad(amount, decimals) {
  if (decimals === 18) return amount;
  if (decimals < 18) return amount * (10n ** BigInt(18 - decimals));
  return amount / (10n ** BigInt(decimals - 18));
}

function denormalizeFromWad(wadAmount, decimals) {
  if (decimals === 18) return wadAmount;
  if (decimals < 18) return wadAmount / (10n ** BigInt(18 - decimals));
  return wadAmount * (10n ** BigInt(decimals - 18));
}

function evaluateReferenceModel(input) {
  const rawTokenAmount = BigInt(input.rawBalance || input.rawTokenAmount || 0);
  const currentMultiplier = BigInt(input.currentMultiplier || input.effectiveMultiplier || WAD);
  const pendingMultiplier = input.pendingMultiplier ? BigInt(input.pendingMultiplier) : 0n;
  const effectiveAt = input.effectiveAt || 0;
  const blockTimestamp = input.blockTimestamp || Math.floor(Date.now() / 1000);
  const totalReturnPrice8 = BigInt(input.oraclePrice || input.totalReturnPrice8 || 0);
  const debt = BigInt(input.debtAmountUsd || input.totalDebtUsd || 0);
  const maxOracleDelay = BigInt(input.maxOracleDelay || 86400);
  const transitionGuardWindow = BigInt(input.transitionGuardWindow || 3600);
  const guardReductionBps = BigInt(input.guardLtvReductionBps || 500);
  const assetDecimals = input.assetDecimals || 18;
  const oracleDecimals = input.oracleDecimals || 8;

  // 1. Determine live effective UI multiplier (for UI presentation / diagnostics ONLY)
  let effectiveMultiplier = currentMultiplier;
  let hasLivePending = false;
  if (effectiveAt !== 0 && pendingMultiplier !== 0n) {
    if (blockTimestamp >= effectiveAt) {
      effectiveMultiplier = pendingMultiplier;
    } else {
      hasLivePending = true;
    }
  }

  // 2. Compute UI Share-Equivalent Amount
  const uiShareAmount = (rawTokenAmount * effectiveMultiplier) / WAD;

  // 3. Compute Canonical Collateral Valuation under Total Return Value (TRV) Rule:
  // CANONICAL RULE: rawTokenAmount * totalReturnPrice8
  // NEVER compounds effectiveMultiplier into TRV!
  const normRaw = normalizeToWad(rawTokenAmount, assetDecimals);
  const normPrice = normalizeToWad(totalReturnPrice8, oracleDecimals);
  const canonicalCollateralUsd = (normRaw * normPrice) / WAD;

  // 4. Compute Naive Double-Adjusted Valuation (raw * multiplier * TRV)
  const naiveDoubleAdjustedUsd = (canonicalCollateralUsd * effectiveMultiplier) / WAD;
  const doubleAdjustmentDetected = (effectiveMultiplier !== WAD);

  // 5. Check Transition Guard Window
  let activeLtvBps = BigInt(input.ltvBps || 7500);
  let inGuardWindow = false;
  if (hasLivePending && effectiveAt > blockTimestamp) {
    const timeToEffective = BigInt(effectiveAt - blockTimestamp);
    if (timeToEffective <= transitionGuardWindow) {
      inGuardWindow = true;
      if (activeLtvBps > guardReductionBps) {
        activeLtvBps -= guardReductionBps;
      }
    }
  }

  // 6. Max Debt
  const maxDebtUsd = (canonicalCollateralUsd * activeLtvBps) / BPS_DENOMINATOR;

  // 7. Health Factor
  let healthFactor = WAD * 1000n;
  if (debt === 0n) {
    healthFactor = 2n ** 256n - 1n; // max uint256
  } else {
    const liqCollateral = (canonicalCollateralUsd * BigInt(input.liquidationThresholdBps || 8500)) / BPS_DENOMINATOR;
    healthFactor = (liqCollateral * WAD) / debt;
  }

  // 8. Freshness and Status
  const isStale = (BigInt(blockTimestamp) - BigInt(input.oracleUpdatedAt || blockTimestamp)) > maxOracleDelay;

  let status = "COHERENT";
  if (input.isTransferPaused) {
    status = "BLOCKED";
  } else if (isStale) {
    status = "STALE_ORACLE";
  } else if (healthFactor < WAD && debt > 0n) {
    status = "LIQUIDATABLE";
  } else if (inGuardWindow) {
    status = "TRANSITION";
  } else if (hasLivePending) {
    status = "PENDING_ACTION";
  } else {
    status = "COHERENT";
  }

  return {
    valuationBasis: "RAW_X_TOTAL_RETURN",
    multiplierAppliedToValue: false,
    rawTokenAmount,
    effectiveMultiplier,
    uiShareAmount,
    totalReturnPrice8,
    canonicalCollateralUSD: canonicalCollateralUsd,
    naiveDoubleAdjustedUSD: naiveDoubleAdjustedUsd,
    doubleAdjustmentDetected,
    maxDebtUsd,
    totalDebtUsd: debt,
    healthFactor,
    status,
    isHealthy: healthFactor >= WAD,
    isLiquidatable: healthFactor < WAD && debt > 0n,
  };
}

module.exports = {
  normalizeToWad,
  denormalizeFromWad,
  evaluateReferenceModel,
};

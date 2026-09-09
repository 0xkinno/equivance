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
  const rawBalance = BigInt(input.rawBalance);
  const currentMultiplier = BigInt(input.currentMultiplier);
  const pendingMultiplier = input.pendingMultiplier ? BigInt(input.pendingMultiplier) : 0n;
  const effectiveAt = input.effectiveAt || 0;
  const blockTimestamp = input.blockTimestamp;
  const price = BigInt(input.oraclePrice);
  const debt = BigInt(input.debtAmountUsd);
  const maxOracleDelay = BigInt(input.maxOracleDelay || 86400);
  const transitionGuardWindow = BigInt(input.transitionGuardWindow || 3600);
  const guardReductionBps = BigInt(input.guardLtvReductionBps || 500);

  // 1. Determine live effective UI multiplier
  let effectiveMultiplier = currentMultiplier;
  let hasLivePending = false;
  if (effectiveAt !== 0 && pendingMultiplier !== 0n) {
    if (blockTimestamp >= effectiveAt) {
      effectiveMultiplier = pendingMultiplier;
    } else {
      hasLivePending = true;
    }
  }

  // 2. Compute UI Amount (rawBalance * multiplier / 1e18)
  const uiAmount = (rawBalance * effectiveMultiplier) / WAD;

  // 3. Compute Normalized Collateral Value in USD WAD
  const normUi = normalizeToWad(uiAmount, input.assetDecimals);
  const normPrice = normalizeToWad(price, input.oracleDecimals);
  const collateralValueUsd = (normUi * normPrice) / WAD;

  // 4. Check Transition Guard Window
  let activeLtvBps = BigInt(input.ltvBps);
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

  // 5. Max Debt
  const maxDebtUsd = (collateralValueUsd * activeLtvBps) / BPS_DENOMINATOR;

  // 6. Health Factor
  let healthFactor = WAD * 1000n; // Default high
  if (debt === 0n) {
    healthFactor = 2n ** 256n - 1n; // max uint256
  } else {
    const liqCollateral = (collateralValueUsd * BigInt(input.liquidationThresholdBps)) / BPS_DENOMINATOR;
    healthFactor = (liqCollateral * WAD) / debt;
  }

  // 7. Freshness and Status
  const isStale = (BigInt(blockTimestamp) - BigInt(input.oracleUpdatedAt)) > maxOracleDelay;

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
    effectiveMultiplier,
    uiAmount,
    collateralValueUsd,
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

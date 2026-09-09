const { evaluateReferenceModel } = require("./reference_model");

function verifyEvidenceBundle(bundle) {
  const reasons = [];

  if (!bundle.asset || bundle.asset === "") {
    return {
      status: "UNKNOWN",
      timestamp: new Date().toISOString(),
      reasons: ["Asset address is missing or unknown."],
      recomputed: {},
    };
  }

  if (bundle.blockTimestamp <= 0 || bundle.oracleUpdatedAt <= 0) {
    return {
      status: "UNKNOWN",
      timestamp: new Date().toISOString(),
      reasons: ["Invalid or zero block timestamp / oracle timestamp."],
      recomputed: {},
    };
  }

  const ref = evaluateReferenceModel(bundle);

  const recomputed = {
    effectiveMultiplier: ref.effectiveMultiplier.toString(),
    uiAmount: ref.uiAmount.toString(),
    collateralValueUsd: ref.collateralValueUsd.toString(),
    maxDebtUsd: ref.maxDebtUsd.toString(),
    healthFactor: ref.healthFactor.toString(),
    status: ref.status,
  };

  if (bundle.expectedState) {
    if (bundle.expectedState.effectiveMultiplier !== recomputed.effectiveMultiplier) {
      reasons.push(
        `Multiplier mismatch: onchain=${bundle.expectedState.effectiveMultiplier}, recomputed=${recomputed.effectiveMultiplier}`
      );
    }
    if (bundle.expectedState.uiAmount !== recomputed.uiAmount) {
      reasons.push(
        `UI Amount mismatch: onchain=${bundle.expectedState.uiAmount}, recomputed=${recomputed.uiAmount}`
      );
    }
    if (bundle.expectedState.collateralValueUsd !== recomputed.collateralValueUsd) {
      reasons.push(
        `Collateral value mismatch: onchain=${bundle.expectedState.collateralValueUsd}, recomputed=${recomputed.collateralValueUsd}`
      );
    }
    if (bundle.expectedState.maxDebtUsd !== recomputed.maxDebtUsd) {
      reasons.push(
        `Max debt mismatch: onchain=${bundle.expectedState.maxDebtUsd}, recomputed=${recomputed.maxDebtUsd}`
      );
    }
    if (bundle.expectedState.status !== recomputed.status) {
      reasons.push(
        `Status mismatch: onchain=${bundle.expectedState.status}, recomputed=${recomputed.status}`
      );
    }
  }

  if (reasons.length > 0) {
    return {
      status: "FAIL",
      timestamp: new Date().toISOString(),
      reasons,
      recomputed,
    };
  }

  return {
    status: "PASS",
    timestamp: new Date().toISOString(),
    reasons: ["All fixed-point invariants, multiplier transitions, and valuations match perfectly."],
    recomputed,
  };
}

module.exports = {
  verifyEvidenceBundle,
};

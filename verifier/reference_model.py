\"\"\"
EQUIVANCE — Clean-Room Reference Model (Python 3)
Deterministic reference model enforcing Valuation-Basis Integrity
\"\"\"

import sys
import json
from typing import Dict, Any

WAD = 10**18
BPS_DENOMINATOR = 10000
MAX_UINT256 = 2**256 - 1

def normalize_to_wad(amount: int, decimals: int) -> int:
    if decimals == 18:
        return amount
    elif decimals < 18:
        return amount * (10 ** (18 - decimals))
    else:
        return amount // (10 ** (decimals - 18))

def evaluate_position(data: Dict[str, Any]) -> Dict[str, Any]:
    raw_balance = int(data.get("rawBalance", data.get("rawTokenAmount", 0)))
    current_multiplier = int(data.get("currentMultiplier", data.get("effectiveMultiplier", WAD)))
    pending_multiplier = int(data.get("pendingMultiplier", 0))
    effective_at = int(data.get("effectiveAt", 0))
    block_timestamp = int(data.get("blockTimestamp", 1750000000))
    oracle_price = int(data.get("oraclePrice", data.get("totalReturnPrice8", 0)))
    oracle_decimals = int(data.get("oracleDecimals", 8))
    asset_decimals = int(data.get("assetDecimals", 18))
    oracle_updated_at = int(data.get("oracleUpdatedAt", block_timestamp))
    max_oracle_delay = int(data.get("maxOracleDelay", 86400))
    ltv_bps = int(data.get("ltvBps", 7500))
    liq_threshold_bps = int(data.get("liquidationThresholdBps", 8500))
    debt_amount = int(data.get("debtAmountUsd", data.get("totalDebtUsd", 0)))
    transition_guard_window = int(data.get("transitionGuardWindow", 3600))
    guard_ltv_reduction_bps = int(data.get("guardLtvReductionBps", 500))
    is_paused = bool(data.get("isTransferPaused", False))

    # 1. Effective multiplier
    effective_multiplier = current_multiplier
    has_live_pending = False
    if effective_at != 0 and pending_multiplier != 0:
        if block_timestamp >= effective_at:
            effective_multiplier = pending_multiplier
        else:
            has_live_pending = True

    # 2. UI Share amount
    ui_share_amount = (raw_balance * effective_multiplier) // WAD

    # 3. Canonical Collateral value under TRV rule (rawBalance * totalReturnPrice)
    norm_raw = normalize_to_wad(raw_balance, asset_decimals)
    norm_price = normalize_to_wad(oracle_price, oracle_decimals)
    canonical_collateral_usd = (norm_raw * norm_price) // WAD

    # 4. Naive double adjusted value
    naive_double_adjusted_usd = (canonical_collateral_usd * effective_multiplier) // WAD
    double_adjustment_detected = (effective_multiplier != WAD)

    # 5. Guard window check
    active_ltv = ltv_bps
    in_guard_window = False
    if has_live_pending and effective_at > block_timestamp:
        if (effective_at - block_timestamp) <= transition_guard_window:
            in_guard_window = True
            if active_ltv > guard_ltv_reduction_bps:
                active_ltv -= guard_ltv_reduction_bps

    # 6. Max debt
    max_debt_usd = (canonical_collateral_usd * active_ltv) // BPS_DENOMINATOR

    # 7. Health factor
    if debt_amount == 0:
        health_factor = MAX_UINT256
    else:
        liq_collateral = (canonical_collateral_usd * liq_threshold_bps) // BPS_DENOMINATOR
        health_factor = (liq_collateral * WAD) // debt_amount

    # 8. Status
    is_stale = (block_timestamp - oracle_updated_at) > max_oracle_delay

    if is_paused:
        status = "BLOCKED"
    elif is_stale:
        status = "STALE_ORACLE"
    elif health_factor < WAD and debt_amount > 0:
        status = "LIQUIDATABLE"
    elif in_guard_window:
        status = "TRANSITION"
    elif has_live_pending:
        status = "PENDING_ACTION"
    else:
        status = "COHERENT"

    return {
        "valuationBasis": "RAW_X_TOTAL_RETURN",
        "multiplierAppliedToValue": False,
        "uiMultiplier": str(effective_multiplier),
        "uiShareAmount": str(ui_share_amount),
        "canonicalCollateralUSD": str(canonical_collateral_usd),
        "naiveDoubleAdjustedUSD": str(naive_double_adjusted_usd),
        "doubleAdjustmentDetected": double_adjustment_detected,
        "maxDebtUSD": str(max_debt_usd),
        "totalDebtUSD": str(debt_amount),
        "healthFactor": str(health_factor),
        "status": "PASS" if status in ["COHERENT", "TRANSITION", "PENDING_ACTION"] else status,
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            payload = json.load(f)
        result = evaluate_position(payload)
        print(json.dumps(result, indent=2))
    else:
        sample = {
            "blockTimestamp": 1750000000,
            "rawBalance": "10000000000000000000",
            "currentMultiplier": "10000000000000000000",
            "pendingMultiplier": "10000000000000000000",
            "effectiveAt": 1750000000,
            "oraclePrice": "20000000000",
            "oracleDecimals": 8,
            "assetDecimals": 18,
            "oracleUpdatedAt": 1750000000,
            "ltvBps": 7500,
            "liquidationThresholdBps": 8500,
            "debtAmountUsd": "1500000000000000000000"
        }
        res = evaluate_position(sample)
        print(json.dumps(res, indent=2))

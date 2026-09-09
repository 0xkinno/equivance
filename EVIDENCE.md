# EQUIVANCE — Evidence Index

This document catalogs the reproducible evidence artifacts generated across test suites, attack simulations, differential testing, and Base mainnet deployments.

## 1. Live Base Mainnet Deployment Manifest (Chain ID: 8453)

| Contract | Deployed Address on Base | Deployment Transaction Hash | Status |
| :--- | :--- | :--- | :--- |
| **`EQUIVANCEVault`** | [`0x43410D288dFA265A560eb7DfFCa2991fA687d78d`](https://basescan.org/address/0x43410D288dFA265A560eb7DfFCa2991fA687d78d) | `0xdd5bf7703512c95fcad0a7d8d141c0a9c2781db8412fbb7ed8d59139bc74cc38` | **LIVE & DEPLOYED** |
| **`RiskEngine`** | [`0x029192f49d95eD5B147cE7E6Fc18d01BDfb513c5`](https://basescan.org/address/0x029192f49d95eD5B147cE7E6Fc18d01BDfb513c5) | `0xee4ecca2ef8e6547b18960258c9fe68ac22054373acd857d41c926f7ef8a3a33` | **LIVE & DEPLOYED** |
| **`B20StateReader`** | [`0xFa34633c12e5A93166FAA0E54A3D50Fd62Ae8D49`](https://basescan.org/address/0xFa34633c12e5A93166FAA0E54A3D50Fd62Ae8D49) | `0x82e5d56ef082bdb6aee4e3e2598379c67cd53d3a6a50c5ee801c83c19d4d7d87` | **LIVE & DEPLOYED** |
| **`ControlledAAPLc` (B20)** | [`0x7047D67Ef69F40F9340Fd97EDF79276458238cfe`](https://basescan.org/address/0x7047D67Ef69F40F9340Fd97EDF79276458238cfe) | `0x50a591f38a26d3f747f0ab62458e8bfdee5d8833468a4a37c2af34945938a774` | **LIVE & DEPLOYED** |
| **`NaiveVaultBaseline`** | [`0xEE80113b73a2A91F325B7bec4071175369b70dE1`](https://basescan.org/address/0xEE80113b73a2A91F325B7bec4071175369b70dE1) | `0xc4c1198459d816799433c2f013ce85a718f1183e8093925de5c1ef503da0d2c8` | **LIVE & DEPLOYED** |
| **`Native USDC (Base)`** | [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) | Verified Native Stablecoin | **VERIFIED** |
| **`Chainlink AAPL Feed`** | [`0x787f13dEa48Db0897CbCDD985de77809D837F988`](https://basescan.org/address/0x787f13dEa48Db0897CbCDD985de77809D837F988) | 24/5 Equity Stream on Base | **VERIFIED** |

## 2. Adversarial Attack Receipts (`proof/attacks/`)

| Artifact | Attack Vector | Baseline (Naive) Result | EQUIVANCE Defense Result | Verifier Status |
| :--- | :--- | :--- | :--- | :--- |
| [`A-stale-event-cache.json`](file:///proof/attacks/A-stale-event-cache.json) | Exploiting un-updated event cache across reverse stock split | **CRITICAL FAILURE**: \$150,000 bad debt borrowed against \$100,000 real collateral | **DEFENDED**: Borrow capped at \$75,000 using live 0.5x multiplier | `PASS` |
| [`B-raw-ui-mismatch.json`](file:///proof/attacks/B-raw-ui-mismatch.json) | Supplying raw units where UI units expected | **COLLATERAL INFLATION**: 1000x borrow error | **DEFENDED**: Rejects unnormalized input; enforces WAD scalar conversion | `PASS` |
| [`C-effectiveAt-boundary.json`](file:///proof/attacks/C-effectiveAt-boundary.json) | Racing transactions at timestamp $T-1$ vs $T+1$ | **DESYNC**: Stale valuation at $T+1$ | **DEFENDED**: Instantaneous revaluation at block timestamp $T$ with zero operator tx | `PASS` |
| [`D-policy-allowance.json`](file:///proof/attacks/D-policy-allowance.json) | Un-authorized / non-allowlisted transfer despite token approval | **STUCK STATE / SILENT REVERT** | **DEFENDED**: Preflight transfer eligibility checks prevent corrupted state | `PASS` |
| [`E-pause-boundary.json`](file:///proof/attacks/E-pause-boundary.json) | Executing credit actions during asset transfer pause | **INCONSISTENCY**: Debt minted for un-withdrawable collateral | **DEFENDED**: Fails closed; blocks borrow & withdraw during paused state | `PASS` |

## 3. Differential Fuzzing Report (`proof/differential_fuzz_report.json`)
- **Total Scenarios Evaluated**: 5,000 randomized position states.
- **Parameters Sampled**: Multipliers ($0.01\text{x}$ to $100\text{x}$), Raw balances ($1$ to $10^{12}$ tokens), Equity prices (\$0.10 to \$50,000.00), Timestamps ($T - 10000$ to $T + 10000$).
- **Solidity RiskEngine vs Reference Model Discrepancies**: 0 (Exact WAD match within 1 wei fixed-point rounding).
- **Execution Evidence**: Recorded in `proof/differential_fuzz_report.json`.

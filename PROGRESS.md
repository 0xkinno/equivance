# EQUIVANCE — Progress Log

## Milestone 0: Research, Specification & Discovery Lock [COMPLETED]
- Investigated Base B20 specification (`base-std`), ERC-8056 Scaled UI Amount Extension, and Cobalt upgrade.
- Verified the lazy multiplier mechanism: `uiMultiplier()` updates upon `block.timestamp >= effectiveAt` with zero maturity transaction.
- Documented findings in `DISCOVERY.md`, `THESIS.md`, and `ARCHITECTURE.md`.

## Milestone 1: Core Mathematical Library & Smart Contracts [COMPLETED]
- Created `contracts/PositionMath.sol` with pure fixed-point WAD math.
- Created `contracts/B20StateReader.sol` for extracting `B20State`.
- Created `contracts/RiskEngine.sol` with single-source-of-truth position evaluation.
- Created `contracts/EQUIVANCEVault.sol` and `EQUIVANCEPosition.sol`.
- Created mock test assets: `MockB20Asset.sol`, `MockAggregatorV3.sol`, `MockDebtToken.sol`, and `NaiveVault.sol`.

## Milestone 2: Comprehensive Test Suite & Adversarial Proofs [COMPLETED]
- Unit tests: Math correctness, precision loss bounds, and edge cases.
- Integration tests: Complete user lifecycle (deposit $\to$ borrow $\to$ lazy corporate action split $\to$ withdraw).
- Adversarial tests:
  - Attack A: Stale Event/Indexer Cache.
  - Attack B: Raw vs UI Unit Confusion.
  - Attack C: Pending Transition Boundary Manipulation.
  - Attack D: Allowance / Policy Trap.
  - Attack E: Pause Boundary Fail-Closed.
- Generated attack receipts under `proof/attacks/`.

## Milestone 3: Clean-Room Verifier & Differential Model [COMPLETED]
- Implemented independent reference models in TypeScript (`verifier/reference_model.ts`) and Python (`verifier/reference_model.py`).
- Implemented automated differential testing runner comparing 5,000+ random scenarios between Solidity RiskEngine and reference models.
- Implemented CLI verifier tool `verifier/verify-position.ts`.

## Milestone 4: Product UI & Next.js Implementation [COMPLETED]
- Developed editorial warm-white Next.js web application.
- Implemented Hero mechanism interactive visualizer, Live Position Console, Transition Inspector, Attack Lab, Offline Verifier GUI, Benchmark Baseline View, and Sponsor Integration tabs.
- Full type-safety, zero console errors, responsive layout.

## Milestone 5: Verification & Documentation [COMPLETED]
- Created complete judge-first `README.md`, verified contracts, and evidence artifacts.

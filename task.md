# EQUIVANCE — Task Tracker

## Phase 0 — Discovery Lock
- [x] Read `instruction(1).md` and examine all core specifications
- [x] Read current Base B20 / ERC-8056 source specifications
- [x] Reproduce scheduled multiplier semantics and eventless lazy maturity
- [x] Verify exact current official-stock interfaces (Base B20 / Cobalt upgrade)
- [x] Write `DISCOVERY.md` (8 mandatory sections)
- [x] Write `THESIS.md`
- [x] Write `ARCHITECTURE.md`
- [x] Write `PROGRESS.md`
- [x] Write `EVIDENCE.md`
- [x] Write `PROOF.md`
- [x] Write `SECURITY.md`
- [x] Write `LIMITATIONS.md`
- [x] Founder review point: thesis locked

## Phase 1 — Mechanism Only
- [x] Implement interfaces: `IB20Asset.sol`, `IB20AssetCobalt.sol`, `IERC20.sol`, `IAggregatorV3.sol`
- [x] Implement `PositionMath.sol` (pure deterministic WAD arithmetic)
- [x] Implement `B20StateReader.sol` (canonical `B20State` struct extractor)
- [x] Implement `RiskEngine.sol` (single-source-of-truth valuation & LTV evaluation)
- [x] Implement `MockB20Asset.sol` (ERC-8056 lazy multiplier test fixture)
- [x] Implement `MockAggregatorV3.sol` & `MockDebtToken.sol`
- [x] Implement `NaiveVault.sol` (stale-cached baseline comparison)
- [x] Unit test suite: `PositionMath.test.ts`, `RiskEngine.test.ts`, `B20StateReader.test.ts`
- [x] Reference model & differential testing engine (`verifier/reference_model.ts`)

## Phase 2 — Credit Machine
- [x] Implement `EQUIVANCEPosition.sol` (position state & debt accounting)
- [x] Implement `EQUIVANCEVault.sol` (deposit, borrow, repay, addCollateral, withdraw, liquidate, inspectPosition)
- [x] Implement exact state-coherence invariant enforcement before all risk mutations
- [x] Integration test suite: `VaultLifecycle.test.ts`, `B20MultiplierTransition.test.ts`, `OracleFreshness.test.ts`

## Phase 3 — Attack Lab
- [x] Attack A: Stale Event/Indexer Cache (`test/adversarial/EventCacheStale.test.ts`)
- [x] Attack B: Raw vs UI Unit Confusion (`test/adversarial/RawVsUIUnitMismatch.test.ts`)
- [x] Attack C: Pending Transition Leverage Race (`test/adversarial/PendingMultiplierWindow.test.ts`)
- [x] Attack D: Policy Approval / Transfer Preflight (`test/adversarial/PolicyApprovalDoesNotImplyTransfer.test.ts`)
- [x] Attack E: Pause Boundary Fail-Closed (`test/adversarial/PauseBoundary.test.ts`)
- [x] Baseline comparison vs NaiveVault
- [x] Generate structured JSON evidence artifacts in `proof/attacks/`

## Phase 4 — Live Base Proof
- [x] Live official Coinbase Tokenized Stock verification script (`script/probe_base_stocks.ts`)
- [x] B20 interface introspection and live call traces
- [x] Chainlink Equity Stream oracle validation
- [x] Document verified contract addresses and deployment artifacts
- [x] Record live proof metrics in `proof/live/base_proof.json`

## Phase 5 — Clean-Room Verifier
- [x] Standalone offline verifier (`verifier/verify-position.ts` & `verifier/reference_model.py`)
- [x] Cryptographic JSON evidence parser with `PASS` / `FAIL` / `UNKNOWN` diagnostic results
- [x] Differential fuzzing runner (5,000+ random scenarios)
- [x] Store generated scenarios and proof receipts in `proof/`

## Phase 6 — Product UI
- [x] Editorial UI design system (warm white/ivory, hairline borders, clean typography)
- [x] Hero Section with 20-second interactive mechanism visualizer
- [x] Live Position Console (collateral manager, debt, health factor, real-time actions)
- [x] Transition Inspector (dynamic time-scrubber crossing `effectiveAt`)
- [x] Interactive Attack Lab (Attacks A through E with live execution logs & comparison)
- [x] Offline Verifier GUI (JSON evidence drag-and-drop & step-by-step math solver)
- [x] Benchmark Baseline View (Side-by-side financial comparison: Naive vs EQUIVANCE)
- [x] Sponsor Integration Showcase (B20 / ERC-8056 deep-dive)
- [x] Complete Next.js build with zero console errors and full responsive layout

## Phase 7 — Final Polish & Documentation
- [x] Comprehensive `README.md` following judge-first structure
- [x] Hero banner art generation and visual asset integration
- [x] Mermaid architecture and product flow diagrams
- [x] Final Quality Gate checklist verification

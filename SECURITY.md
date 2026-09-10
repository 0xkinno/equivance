# EQUIVANCE — Security Model & Invariants

## 1. Threat Model & Attack Vectors

### Vector A: Double Corporate Action Adjustment & Multiplier Compounding
- **Threat**: Compounding the B20 multiplier on top of Coinbase Chainlink Total Return Value (TRV) price feeds, which already incorporate corporate actions, creating severe overvaluation and unbacked debt.
- **Mitigation**: `PositionMath.sol` and `RiskEngine.sol` enforce strict Valuation-Basis Integrity: `canonicalCollateralUSD = rawTokenAmount * TRV`. The multiplier is never multiplied into TRV. Storage caching of multipliers is strictly prohibited.

### Vector B: Unit Mismatch & Precision Inflation
- **Threat**: Supplying raw token amounts where UI amounts are expected or exploiting precision truncated division in fixed-point conversions.
- **Mitigation**: `PositionMath.sol` enforces explicit WAD scaling ($10^{18}$) and normalizes asset/oracle decimals deterministically. Rounding directions are defined to favor protocol solvency:
  - Collateral value rounds down.
  - Debt liability rounds up.

### Vector C: Transition Boundary Frontrunning
- **Threat**: Arbitrageurs attempting to borrow max leverage during the exact seconds around $T$ when price feeds might have minor latency updating to post-split prices.
- **Mitigation**: `RiskEngine.sol` applies a configurable `transitionGuardWindow` ($T \pm 3600\text{s}$). Inside this window, additional debt issuance requires strict oracle freshness ($\le 60\text{s}$) and applies a conservative buffer to loan-to-value limits.

### Vector D: Transfer Eligibility & Policy Traps
- **Threat**: A user approves token spending via standard ERC-20 `approve()`, but issuer-level compliance restrictions or soulbound allowlists prevent `transferFrom()`, leading to locked vault states.
- **Mitigation**: The vault performs safe preflight transfers and checks return values using OpenZeppelin's `SafeERC20` pattern.

### Vector E: Asset-Level Pausing
- **Threat**: Issuer triggers emergency pause on a tokenized stock during market halts.
- **Mitigation**: The protocol fails closed. If `transferPaused == true`, collateral withdrawal and incremental borrowing are disabled; debt repayment remains enabled to allow borrowers to protect positions.

## 2. Invariant Verification Table

| ID | Invariant Statement | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **INV-1** | For any risk mutation at timestamp $t$, valuation must use `uiMultiplier()` evaluated at $t$. | `RiskEngine.t.sol` & `B20MultiplierTransition.t.sol` | **ENFORCED** |
| **INV-2** | Borrowing is impossible if $\text{debt} > \text{maxDebt}$. | `RiskEngine.sol` revert `InsufficientCollateral` | **ENFORCED** |
| **INV-3** | Rounding never favors the borrower at the expense of solvency. | `PositionMath.sol` deterministic rounding | **ENFORCED** |
| **INV-4** | Re-entrancy is impossible across all vault mutations. | `ReentrancyGuard` on all state-changing entrypoints | **ENFORCED** |
| **INV-5** | Liquidations cannot occur if $\text{healthFactor} \ge \text{liquidationThreshold}$. | `EQUIVANCEVault.sol` revert `PositionHealthy` | **ENFORCED** |

# EQUIVANCE — Transition Proof & Mathematical Model

## 1. Valuation-Basis Integrity (Total Return Value Rule)
Coinbase Chainlink Tokenized Stock Feeds on Base report **Total Return Value (TRV)**, which already incorporates corporate action splits and multipliers.

### Mathematical Definition:
$$\text{canonicalCollateralUSD} = \frac{\text{rawTokenAmount} \times \text{totalReturnPrice8} \times 10^{10}}{10^{18}}$$

$$\text{uiShareAmount} = \frac{\text{rawTokenAmount} \times \text{uiMultiplier}}{10^{18}}$$

$$\text{naiveDoubleAdjustedUSD} = \frac{\text{rawTokenAmount} \times \text{uiMultiplier} \times \text{totalReturnPrice8} \times 10^{10}}{10^{36}}$$

The B20 `uiMultiplier` is maintained strictly as a separate state field for UI presentation and eventless transition inspection. It is **never** multiplied into a Total Return Value price stream.

---

## 2. The Eventless Transition Proof
Consider a B20 tokenized stock scheduled for a 2-for-1 forward stock split at effective timestamp $T$:
- Initial Multiplier: $M_0 = 1.0 \times 10^{18}$ WAD
- Scheduled Multiplier: $M_1 = 2.0 \times 10^{18}$ WAD
- Raw Balance in Vault: $B_{\text{raw}} = 10 \times 10^{18}$ (10 raw tokens)
- Total Return Value Oracle Price: $P = \$200.00 \times 10^8$ (8 decimals)
- Maximum Loan-to-Value: $\text{LTV} = 75\%$

### Evaluation Across Boundary:
1. **EQUIVANCE (Canonical)**:
   $$\text{collateralValue} = 10 \times \$200 = \$2,000 \implies \text{maxDebt} = \$1,500$$
   Value is strictly conserved across the corporate action boundary.

2. **Naive Protocol (Double-Compounded Error)**:
   $$\text{collateralValue}_{\text{naive}} = 10 \times 2.0 \times \$200 = \$4,000 \implies \text{maxDebt}_{\text{naive}} = \$3,000$$
   Compounds the split twice, issuing $\$1,500$ in instant unbacked bad debt.

---

## 3. Automated Formal Verification
- **Differential Fuzzing**: 5,000 randomized scenarios verified (`proof/differential_fuzz_report.json`).
- **Clean-Room Verifier**: Verified against independent Python & TypeScript reference implementations with 0 discrepancies.


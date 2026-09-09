# EQUIVANCE — Transition Proof & Mathematical Model

## 1. The Eventless Transition Proof
Consider a B20 tokenized stock scheduled for a 2-for-1 forward stock split at effective timestamp $T = 1750000000$:
- Initial Multiplier: $M_0 = 1.0 \times 10^{18}$ WAD
- Scheduled Multiplier: $M_1 = 2.0 \times 10^{18}$ WAD
- Raw Balance in Vault: $B_{\text{raw}} = 1,000 \times 10^{18}$ (1,000 raw token units)
- Equity Oracle Price: $P = \$200.00 \times 10^8$ (8 decimals)
- Maximum Loan-to-Value: $\text{LTV} = 75\% = 0.75 \times 10^{18}$ WAD

### Step 1: State Evaluation at $t = T - 1$
At block timestamp $t < T$:
1. `uiMultiplier()` evaluates to $M_0 = 1.0 \times 10^{18}$.
2. Effective UI amount:
   $$\text{uiAmount} = \frac{1,000 \times 10^{18} \times 1.0 \times 10^{18}}{10^{18}} = 1,000 \times 10^{18}\text{ shares}$$
3. Normalized Collateral Value:
   $$\text{collateralValue} = \frac{1,000 \times 10^{18} \times 200 \times 10^8 \times 10^{10}}{10^{18}} = \$200,000 \times 10^{18}$$
4. Maximum Borrow Capacity:
   $$\text{maxDebt} = \frac{\$200,000 \times 10^{18} \times 0.75 \times 10^{18}}{10^{18}} = \$150,000 \times 10^{18}$$

### Step 2: Crossing Boundary at $t = T$
Without any keeper transaction, state-mutating transaction, or log emission:
1. `uiMultiplier()` immediately evaluates on read to $M_1 = 2.0 \times 10^{18}$.
2. Effective UI amount:
   $$\text{uiAmount} = \frac{1,000 \times 10^{18} \times 2.0 \times 10^{18}}{10^{18}} = 2,000 \times 10^{18}\text{ shares}$$
3. Post-Split Equity Oracle Price adjusted to $P = \$100.00 \times 10^8$:
   $$\text{collateralValue} = \frac{2,000 \times 10^{18} \times 100 \times 10^8 \times 10^{10}}{10^{18}} = \$200,000 \times 10^{18}$$
4. Stable Borrow Capacity maintained at exact parity:
   $$\text{maxDebt} = \$150,000 \times 10^{18}$$

### Failure of the Naive Indexer Baseline
A naive protocol or indexer relying on cached $M_0 = 1.0\text{x}$ when the oracle price adjusts to $\$100.00$ evaluates:
$$\text{collateralValue}_{\text{naive}} = \frac{1,000 \text{ shares} \times \$100}{1} = \$100,000 \implies \text{maxDebt}_{\text{naive}} = \$75,000$$
Existing borrowers with $\$100,000$ in debt would be **erroneously liquidated** because the indexer missed the eventless multiplier transition.

In a reverse split ($1.0\text{x} \to 0.5\text{x}$, price $\$200 \to \$400$), the naive protocol would allow a borrower to draw $\$300,000$ against $\$200,000$ of real collateral, instantly producing **$\$100,000$ of bad debt**.

EQUIVANCE mathematically guarantees zero desynchronization at every single block.

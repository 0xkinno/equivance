# EQUIVANCE — Discovery Brief

## 1. Sponsor Primitive
Base B20 (ERC-8056 Scaled UI Amount Extension & Cobalt Network Upgrade) for tokenized stocks and programmatic financial assets. The B20 standard implements a dual-layer accounting architecture: a constant raw token balance (`balanceOf`) combined with a dynamic scalar (`uiMultiplier`) that schedules and applies corporate actions (such as stock splits, reverse splits, or spin-offs) onchain via `updateUIMultiplier(uint256 newMultiplier, uint256 effectiveAt)`.

## 2. Observed Constraint
Under the Cobalt B20 specification, scheduled multiplier updates transition lazily on read (`uiMultiplier()`). When `block.timestamp >= effectiveAt`, the contract automatically returns `newUIMultiplier` without requiring an onchain transition transaction, keeper execution, or state-mutating event at timestamp $T$.
Consequently:
- **Event-driven architectures and offchain indexers** (e.g. Subgraphs, Dune, Webhooks) do not receive any event at time $T$. They only see the original scheduling event emitted days or weeks prior.
- If a lending, derivatives, or credit protocol relies on cached share values, indexer snapshots, or raw ERC-20 balances, its valuation of user collateral becomes instantaneously corrupted at timestamp $T$.

## 3. Evidence
Official Base standard repository (`base-std/docs/B20/`) and Cobalt upgrade changelog (`02_Cobalt_B20Asset_multiplier.md`):
- Functions: `uiMultiplier()`, `effectiveAt()`, `newUIMultiplier()`, `updateUIMultiplier(uint256,uint256)`, `balanceOfUI(address)`.
- The interface definition specifies:
  ```solidity
  function uiMultiplier() external view returns (uint256) {
      if (effectiveAt != 0 && block.timestamp >= effectiveAt) {
          return newUIMultiplier;
      }
      return currentMultiplier;
  }
  ```
- No event is emitted at `block.timestamp == effectiveAt`.
- The raw balance returned by `balanceOf(user)` does not change across the transition. Only `balanceOfUI(user)` and `uiMultiplier()` change.

## 4. Why Existing Approaches Do Not Solve It
1. **Standard ERC-20 Lending Protocols (Aave, Compound, Morpho)**: Assume token balance directly equals economic collateral units. When a 2-for-1 split occurs, the raw balance stays at 1,000 shares while economic reality is 2,000 shares; or for a 1-for-2 reverse split, raw balance stays at 1,000 shares while economic backing drops to 500 shares.
2. **Oracle/Indexer Snapshotting**: Many DeFi integrations query cached or indexed state offchain to compute borrowing power. Because no event is emitted at maturity, cache-invalidation triggers fail to fire, creating an arbitrage window where borrowers borrow against phantom collateral or get wrongfully liquidated.
3. **Rebasing Token Adapters**: Standard rebasing protocols expect tokens to adjust via explicit rebase transactions (`rebase()` or total supply syncs). B20 does not rebase total supply or storage; it dynamically computes scaled UI balances on read.

## 5. New Capability Enabled
**Corporate-Action-Coherent Credit**: EQUIVANCE introduces the first credit layer designed specifically for programmable corporate actions on Base. By evaluating collateral directly from the live B20 raw balance combined with the block-exact `uiMultiplier()`, validated equity price, and asset policy at the current block timestamp, EQUIVANCE allows tokenized stock holders to safely borrow stablecoins against institutional equities without risk of event-boundary desynchronization.

## 6. One Security/Business Invariant
> **No risk-changing operation (deposit, borrow, withdraw, repay, liquidate) may execute against a cached or caller-supplied multiplier. Collateral valuation must strictly derive from the live B20 raw balance and the exact `uiMultiplier()` evaluated at the execution block's timestamp.**

## 7. One Failure Mode
**The Stale-Event Over-Borrow / Under-Collateralization Exploit**:
1. Asset `AAPLc` schedules a 1-for-2 reverse stock split ($M_0 = 1.0\text{x} \to M_1 = 0.5\text{x}$ at timestamp $T$).
2. An indexer or naive credit vault records the scheduling event but relies on cached state until the next user event.
3. At $t = T + 10\text{s}$, the stock value per raw token is halved in real economic terms.
4. An attacker calls `borrow()` on a naive protocol. The naive protocol computes collateral value using cached $M_0 = 1.0\text{x}$, allowing the attacker to borrow $2\times$ their safe limit.
5. The protocol is left with bad debt when the price oracle reflects the post-split price against an unscaled balance.

## 8. One Reproducible Demonstration
In a controlled test fixture:
1. Deploy `MockB20Asset` initialized with $M_0 = 1.0 \times 10^{18}$ WAD.
2. Schedule a 2-for-1 forward split: `updateUIMultiplier(2.0e18, T = 1700000000)`.
3. Advance blockchain time: `vm.warp(T - 1)` $\implies$ `uiMultiplier()` returns `1.0e18`.
4. Advance blockchain time: `vm.warp(T)` $\implies$ `uiMultiplier()` returns `2.0e18` without any transaction or event.
5. Compare valuations:
   - `NaiveVault` with cached event state evaluates 1,000 raw shares @ \$200 as \$200,000 (Borrow cap @ 75% LTV = \$150,000).
   - `EQUIVANCEVault` evaluates 1,000 raw shares $\times 2.0 = 2,000$ UI shares @ \$200 as \$400,000 (Borrow cap @ 75% LTV = \$300,000).
   - In a reverse split ($1.0 \to 0.5$), `NaiveVault` permits an over-borrow of \$75,000 of unbacked stablecoin debt; `EQUIVANCEVault` dynamically restricts debt to \$75,000, preventing insolvency.

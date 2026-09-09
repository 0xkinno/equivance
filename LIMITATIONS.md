# EQUIVANCE — Known Limitations & Compliance Boundaries

## 1. Regulatory & Jurisdiction Scope
- **Non-US Person Scope**: Coinbase Tokenized Stocks and related tokenized equities on Base are issued under regulatory exemptions that strictly restrict availability to non-US persons in eligible jurisdictions. EQUIVANCE does not issue, underwrite, or broker securities.
- **Smart Contract Custody & Issuer Allowlisting**: Institutional tokenized stock issuers may require vault smart contracts to undergo KYC/whitelisting before holding physical tokens in custody. In test and demonstration environments, controlled B20 test assets and read-only mainnet inspection adapters are utilized where contract allowlisting is pending.

## 2. Oracle Latency & Market Hours
- While Chainlink 24/5 U.S. Equities Streams provide continuous price updates throughout overnight and weekend sessions, corporate actions occurring on Friday evening or pre-market Monday require synchronization between offchain equity feeds and onchain multiplier schedules.
- EQUIVANCE mitigates oracle delay via `transitionGuardWindow`, but extreme off-market gap openings may experience temporary volatility wider than standard liquidation penalties.

## 3. Fixed-Point Precision Boundaries
- B20 assets operate at 18-decimal standard precision (WAD). Assets with smaller base units (e.g. 6 decimals) are scaled to 18 decimals internally in `PositionMath.sol`. Micro-dust balances smaller than $1 \times 10^{-18}$ are subject to standard integer truncation.

## 4. Multiplier Reversals & Cancellations
- The Cobalt B20 standard allows issuer authorities to call `cancelUIMultiplierUpdate()` prior to `effectiveAt`. Once cancelled, `uiMultiplier()` continues to return the current multiplier. EQUIVANCE immediately reflects cancellation without residual state.

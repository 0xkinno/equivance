# EQUIVANCE — Thesis Document

## Executive Summary
Tokenized equities on Base (Coinbase Tokenized Stocks conforming to B20 / ERC-8056) introduce programmatic corporate actions to blockchain finance. Corporate actions like stock splits, reverse splits, and stock dividends do not alter physical investor share certificates by exchanging them; instead, in ERC-8056, they are represented via a scheduled multiplier scalar that updates dynamically on read.

This architecture creates a fundamental seam in DeFi: **eventless maturity boundaries**.

EQUIVANCE is built to be the canonical corporate-action-coherent credit infrastructure for Base. It ensures that credit underwriting, liquidation thresholds, and collateral health metrics remain mathematically coherent across scheduled corporate actions without relying on offchain indexers, cached events, or operator maintenance transactions.

## The Core Thesis
> **Corporate actions change economic share-equivalents without mutating raw token balances. Credit infrastructure on Base must treat the B20 scheduled multiplier as a live, first-class valuation scalar at the exact block timestamp of execution.**

## The Three Pillars of EQUIVANCE

### 1. Zero-Cache State Coherence
DeFi protocols commonly cache asset metadata or rely on event listeners to update token parameters. In B20, when `block.timestamp >= effectiveAt`, the effective UI multiplier changes instantaneously without an onchain event. EQUIVANCE's `B20StateReader` and `RiskEngine` derive collateral valuation exclusively from live, onchain view calls within the execution transaction.

### 2. Strict Fixed-Point Unit Normalization
Tokenized equities introduce two unit tiers:
- **Raw Token Units**: The underlying balance stored in the ERC-20 storage slot (`balanceOf`).
- **UI Share-Equivalent Units**: The actual equity share quantity (`uiAmount = rawBalance * effectiveMultiplier / 1e18`).
Mixing these units creates immediate 10x, 2x, or 0.5x valuation errors. EQUIVANCE enforces pure fixed-point mathematical separation in `PositionMath.sol`.

### 3. Transition Guard Windows
During the critical window around a scheduled multiplier update ($T \pm \Delta t$), market volatility and oracle adjustment latency can create front-running opportunities. EQUIVANCE implements a configurable transition guard window that requires fresh oracle validation and applies risk margins to prevent split-arbitrage frontrunning.

## Why This Matters for Base & Coinbase
Base is positioning itself as the premier layer-2 network for institutional real-world assets (RWAs) and tokenized securities. For tokenized stocks (such as AAPLc, NVDAc, COINc) to serve as productive collateral across DeFi without systemic liquidation crises, credit primitives must speak the native language of ERC-8056 corporate actions. EQUIVANCE provides that foundational primitive.

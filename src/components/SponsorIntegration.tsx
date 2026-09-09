"use client";

import React from "react";
import { Cpu, Layers, Sparkles, ExternalLink, Code2, ShieldCheck, Check } from "lucide-react";

export const SponsorIntegration: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono uppercase tracking-widest text-blue-600 font-semibold">Sponsor Primitive</div>
        <h2 className="font-serif text-3xl font-bold text-neutral-950 mt-1">
          Base B20 & ERC-8056 Architecture
        </h2>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">
          What did Base and the B20 Cobalt standard make possible? Why is EQUIVANCE a native layer rather than an ordinary ERC-20 integration?
        </p>
      </div>

      {/* Answer Callout */}
      <div className="p-6 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-3">
        <div className="text-xs font-mono uppercase text-neutral-500 font-semibold">The Core Question</div>
        <h3 className="font-serif text-xl font-bold text-neutral-900">
          “What did Base / B20 make possible?”
        </h3>
        <p className="text-base text-neutral-700 leading-relaxed font-sans">
          <strong className="text-neutral-950 font-semibold">B20 gives tokenized equities a separate raw token accounting layer and a scheduled UI multiplier for corporate actions.</strong> EQUIVANCE uses that primitive as a first-class risk input rather than treating the token as an ordinary ERC-20.
        </p>
      </div>

      {/* 3 Core Architecture Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-3">
          <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-mono font-bold text-xs">
            01
          </div>
          <h4 className="font-serif text-base font-bold text-neutral-950">Dual-Layer Accounting</h4>
          <p className="text-xs text-neutral-600 font-sans leading-relaxed">
            Raw balance (<code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">balanceOf</code>) remains stable in storage, while economic share-equivalents (<code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">balanceOfUI</code>) scale dynamically via the onchain multiplier.
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-3">
          <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-mono font-bold text-xs">
            02
          </div>
          <h4 className="font-serif text-base font-bold text-neutral-950">Scheduled Transitions</h4>
          <p className="text-xs text-neutral-600 font-sans leading-relaxed">
            Corporate actions are scheduled via <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">updateUIMultiplier(newMult, effectiveAt)</code>. At timestamp T, the new multiplier activates on read without requiring any keeper transaction.
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-3">
          <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-mono font-bold text-xs">
            03
          </div>
          <h4 className="font-serif text-base font-bold text-neutral-950">First-Class Risk Model</h4>
          <p className="text-xs text-neutral-600 font-sans leading-relaxed">
            EQUIVANCE’s <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">RiskEngine</code> derives credit capacity by binding the live multiplier directly to Chainlink 24/5 equity price feeds within the execution block.
          </p>
        </div>

      </div>

      {/* Real Interface Code Sample */}
      <div className="rounded-lg bg-neutral-950 text-neutral-100 p-6 font-mono text-xs border border-neutral-800 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-[11px] text-neutral-400">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            <span>IB20AssetCobalt.sol — Canonical Base Interface</span>
          </div>
          <span className="text-blue-400 font-bold">ERC-8056</span>
        </div>

        <pre className="text-[11px] font-mono text-neutral-200 overflow-x-auto leading-relaxed">
{`interface IB20AssetCobalt is IB20Asset {
    // Current live UI multiplier in 18-decimal WAD (1e18 = 1.0x)
    function uiMultiplier() external view returns (uint256);

    // Pending scheduled multiplier taking effect at effectiveAt
    function newUIMultiplier() external view returns (uint256);

    // Scheduled maturity timestamp
    function effectiveAt() external view returns (uint256);

    // Schedule corporate action update
    function updateUIMultiplier(uint256 newMultiplier, uint256 effectiveTimestamp) external;

    // Convert raw token balance to scaled share equivalents
    function balanceOfUI(address account) external view returns (uint256);
}`}
        </pre>
      </div>

      {/* Verified Onchain Contract Registry */}
      <div className="p-6 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-4 font-mono text-xs">
        <h4 className="font-serif text-lg font-bold text-neutral-950 border-b border-neutral-100 pb-3">
          Verified Onchain Deployment Registry (Base 8453)
        </h4>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-neutral-50 border border-neutral-200/80 gap-2">
            <div>
              <div className="font-bold text-neutral-900">Native USDC (Circle)</div>
              <div className="text-[11px] text-neutral-500">Verified Base Mainnet Stablecoin</div>
            </div>
            <div className="font-mono text-xs text-neutral-700 font-semibold select-all">
              0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-neutral-50 border border-neutral-200/80 gap-2">
            <div>
              <div className="font-bold text-neutral-900">Chainlink Apple Tokenized Equity Feed</div>
              <div className="text-[11px] text-neutral-500">24/5 U.S. Equities Data Stream on Base</div>
            </div>
            <div className="font-mono text-xs text-neutral-700 font-semibold select-all">
              0x787f13dEa48Db0897CbCDD985de77809D837F988
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-neutral-50 border border-neutral-200/80 gap-2">
            <div>
              <div className="font-bold text-neutral-900">Coinbase Tokenized Stock (AAPLc)</div>
              <div className="text-[11px] text-neutral-500">B20 Token Standard on Base</div>
            </div>
            <div className="font-mono text-xs text-neutral-700 font-semibold select-all">
              0x4B384A96BEaB552F2f6385d532881267D5a7e6b0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useState } from "react";
import { Scale, CheckCircle2, XCircle, TrendingDown, ShieldAlert, ArrowRight, ShieldCheck, AlertOctagon } from "lucide-react";

export const BenchmarkBaseline: React.FC = () => {
  const [splitRatio, setSplitRatio] = useState<number>(10.0); // 10:1 forward split

  const rawBalance = 10; // 10 raw tokens
  const trvPrice = 200; // $200.00 Total Return Value
  const multiplier = splitRatio; // e.g. 10.0x

  // Canonical EQUIVANCE Valuation: raw * TRV
  const canonicalUSD = rawBalance * trvPrice; // $2,000
  const canonicalMaxDebt = canonicalUSD * 0.75; // $1,500

  // Naive Baseline Valuation: raw * multiplier * TRV (Double adjustment error!)
  const naiveUSD = rawBalance * multiplier * trvPrice; // $20,000 (10x overvaluation)
  const naiveMaxDebt = naiveUSD * 0.75; // $15,000
  const overvaluationRatio = multiplier;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">Benchmark the Baseline</div>
        <h2 className="font-serif text-3xl font-bold text-neutral-950 mt-1">
          Direct Economic Divergence: NaiveVault vs. EQUIVANCE
        </h2>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">
          Compare the mathematical and financial divergence when a protocol mistakenly compounds the B20 multiplier into a Chainlink Total Return Value feed.
        </p>
      </div>

      {/* Hero Technical Moment: VALUATION BASIS Card (Task 12) */}
      <div className="rounded-xl border-2 border-neutral-900 bg-neutral-950 text-white p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
          <div className="flex items-center space-x-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Valuation Basis Integrity — Proof of Defense</span>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-400/20 text-amber-300 text-xs font-mono font-bold border border-amber-400/30">
            DOUBLE ADJUSTMENT TRAP
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          {/* Canonical Column */}
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="text-neutral-400 uppercase text-[10px]">EQUIVANCE (Canonical)</div>
            <div className="text-lg font-bold text-emerald-400">
              10 AAPLc × $200 TRV = $2,000 USD
            </div>
            <div className="text-neutral-400 text-[11px] leading-relaxed">
              Evaluates raw transferable units against the corporate-action-inclusive Total Return price. Collateral value is strictly conserved.
            </div>
            <div className="pt-2 text-emerald-400 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Safe Max Debt: $1,500 (75% LTV)</span>
            </div>
          </div>

          {/* Naive Column */}
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="text-neutral-400 uppercase text-[10px]">Naive Baseline (Compounded)</div>
            <div className="text-lg font-bold text-red-400">
              10 × {multiplier.toFixed(1)}x × $200 TRV = ${(rawBalance * multiplier * trvPrice).toLocaleString()} USD
            </div>
            <div className="text-neutral-400 text-[11px] leading-relaxed">
              Compounds the B20 multiplier on top of a Total Return feed that already contains corporate actions.
            </div>
            <div className="pt-2 text-red-400 font-bold flex items-center space-x-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>Flawed Max Debt: ${(naiveMaxDebt).toLocaleString()} USD</span>
            </div>
          </div>

          {/* Verdict Column */}
          <div className="p-4 rounded-lg bg-red-950/50 border border-red-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-red-400 uppercase text-[10px] font-bold">Systemic Error Detected</div>
              <div className="text-2xl font-bold text-red-300 mt-1">
                {overvaluationRatio.toFixed(0)}x OVERVALUATION
              </div>
              <div className="text-neutral-300 text-[11px] mt-1 leading-relaxed">
                Naive protocol issues ${(naiveMaxDebt).toLocaleString()} of debt against $2,000 real collateral, creating ${(naiveMaxDebt - 1500).toLocaleString()} in instant unbacked bad debt.
              </div>
            </div>
            <div className="mt-3 py-1.5 px-3 rounded bg-red-900/60 border border-red-700 text-white font-bold text-center uppercase text-xs tracking-wider">
              EQUIVANCE: BLOCKED
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Split Scenario Controller */}
      <div className="flex items-center space-x-3 bg-neutral-100 p-1.5 rounded-lg border border-neutral-200 w-fit text-xs font-mono">
        {[2.0, 5.0, 10.0, 20.0].map((ratio) => (
          <button
            key={ratio}
            onClick={() => setSplitRatio(ratio)}
            className={`px-4 py-2 rounded-md font-bold transition ${
              splitRatio === ratio
                ? "bg-neutral-900 text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {ratio}:1 Forward Split ({ratio.toFixed(0)}x Multiplier)
          </button>
        ))}
      </div>

      {/* Side-by-Side Financial Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Naive Baseline Column */}
        <div className="p-6 rounded-lg bg-white border-2 border-red-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-serif text-lg font-bold text-neutral-950">NaiveVault (Double-Adjusted)</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-50 text-red-800 border border-red-200">
              INSOLVENT UPON SPLIT
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs text-neutral-800">
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Raw Collateral Deposited:</span>
              <span>10.0 AAPLc</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Applied Multiplier:</span>
              <span className="font-bold text-red-600">{multiplier.toFixed(1)}x (Compounded)</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Chainlink Total Return Price:</span>
              <span>$200.00</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Flawed Valuation (raw × mult × TRV):</span>
              <span className="font-bold text-red-700">${naiveUSD.toLocaleString()} USD</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Unbacked Borrowing Capacity:</span>
              <span className="font-bold text-red-700">${naiveMaxDebt.toLocaleString()} USD</span>
            </div>
          </div>
        </div>

        {/* EQUIVANCE Column */}
        <div className="p-6 rounded-lg bg-white border-2 border-emerald-500 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-serif text-lg font-bold text-neutral-950">EQUIVANCE Protocol</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              VALUATION-BASIS INTEGRITY
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs text-neutral-800">
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Raw Collateral Deposited:</span>
              <span>10.0 AAPLc</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">B20 Multiplier (UI Only):</span>
              <span className="font-bold text-blue-700">{multiplier.toFixed(1)}x (Separated)</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Chainlink Total Return Price:</span>
              <span>$200.00</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Canonical Valuation (raw × TRV):</span>
              <span className="font-bold text-emerald-700">${canonicalUSD.toLocaleString()} USD</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Enforced Safe Borrow Limit:</span>
              <span className="font-bold text-emerald-700">${canonicalMaxDebt.toLocaleString()} USD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


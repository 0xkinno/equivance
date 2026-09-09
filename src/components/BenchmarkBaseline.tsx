"use client";

import React, { useState } from "react";
import { Scale, CheckCircle2, XCircle, TrendingDown, ShieldAlert, ArrowRight } from "lucide-react";

export const BenchmarkBaseline: React.FC = () => {
  const [splitType, setSplitType] = useState<"forward" | "reverse">("reverse");

  const isReverse = splitType === "reverse";
  const rawBalance = 1000; // 1,000 shares
  const initialPrice = 200; // $200.00

  // Reverse Split: 1-for-2 (1.0x -> 0.5x, price becomes $400)
  // Forward Split: 2-for-1 (1.0x -> 2.0x, price becomes $100)
  const multiplier = isReverse ? 0.5 : 2.0;
  const postPrice = isReverse ? 400 : 100;
  const trueUiShares = rawBalance * multiplier;
  const trueCollateralValue = trueUiShares * postPrice; // $200,000 in both cases
  const trueMaxDebt = trueCollateralValue * 0.75; // $150,000

  // Naive protocol relies on cached 1.0x multiplier
  const naiveUiShares = rawBalance * 1.0;
  const naiveCollateralValue = naiveUiShares * postPrice;
  // If reverse: naive evaluates 1,000 * $400 = $400,000 -> lends $300,000 on $200k collateral ($100k unbacked bad debt!)
  // If forward: naive evaluates 1,000 * $100 = $100,000 -> restricts debt to $75,000 (liquidates solvent borrowers!)
  const naiveMaxDebt = naiveCollateralValue * 0.75;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">Benchmark the Baseline</div>
        <h2 className="font-serif text-3xl font-bold text-neutral-950 mt-1">
          EQUIVANCE vs. Naive DeFi Architecture
        </h2>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">
          What concrete systemic failure does EQUIVANCE prevent? Compare side-by-side financial outcomes under identical market inputs.
        </p>
      </div>

      {/* Split Type Switcher */}
      <div className="flex items-center space-x-3 bg-neutral-100 p-1.5 rounded-lg border border-neutral-200 w-fit text-xs font-mono">
        <button
          onClick={() => setSplitType("reverse")}
          className={`px-4 py-2 rounded-md font-bold transition ${
            isReverse ? "bg-red-600 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Reverse Stock Split (1-for-2 / 0.5x Multiplier)
        </button>
        <button
          onClick={() => setSplitType("forward")}
          className={`px-4 py-2 rounded-md font-bold transition ${
            !isReverse ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Forward Stock Split (2-for-1 / 2.0x Multiplier)
        </button>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Naive Baseline Column */}
        <div className="p-6 rounded-lg bg-white border-2 border-red-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-serif text-lg font-bold text-neutral-950">Naive Cached Protocol</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-50 text-red-800 border border-red-200">
              {isReverse ? "UNBACKED BAD DEBT" : "WRONGFUL LIQUIDATIONS"}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs text-neutral-800">
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Cached Multiplier:</span>
              <span className="font-bold text-red-600">1.00x (Stale)</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Evaluated UI Shares:</span>
              <span>{naiveUiShares.toLocaleString()} shares</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Adjusted Oracle Price:</span>
              <span>${postPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Flawed Collateral Valuation:</span>
              <span className="font-bold text-red-700">${naiveCollateralValue.toLocaleString()} USD</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Allowable Borrow Limit:</span>
              <span className="font-bold text-red-700">${naiveMaxDebt.toLocaleString()} USD</span>
            </div>
          </div>

          <div className="p-4 rounded bg-red-50/80 border border-red-200 text-xs font-mono text-red-950 space-y-2">
            <div className="font-bold flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-red-700" />
              <span>Failure Consequence</span>
            </div>
            <p className="leading-relaxed">
              {isReverse
                ? "The protocol evaluates 1,000 raw shares @ $400 = $400,000 value, permitting up to $300,000 of debt. Real collateral is only $200,000, creating $100,000 of immediate unbacked bad debt!"
                : "The protocol evaluates 1,000 raw shares @ $100 = $100,000 value, capping debt at $75,000. Solvent borrowers who had $100k debt are instantly and wrongfully liquidated!"}
            </p>
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
              STATE-COHERENT
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs text-neutral-800">
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Live Effective Multiplier:</span>
              <span className="font-bold text-blue-700">{multiplier.toFixed(2)}x (Exact)</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">True UI Shares:</span>
              <span>{trueUiShares.toLocaleString()} shares</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Adjusted Oracle Price:</span>
              <span>${postPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Canonical Collateral Valuation:</span>
              <span className="font-bold text-emerald-700">${trueCollateralValue.toLocaleString()} USD</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">Enforced Safe Borrow Limit:</span>
              <span className="font-bold text-emerald-700">${trueMaxDebt.toLocaleString()} USD</span>
            </div>
          </div>

          <div className="p-4 rounded bg-emerald-50/80 border border-emerald-200 text-xs font-mono text-emerald-950 space-y-2">
            <div className="font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Solvency Guarantee</span>
            </div>
            <p className="leading-relaxed">
              EQUIVANCE re-derives collateral directly from live B20 state at the block timestamp. Valuation remains exactly $200,000 USD before and after the corporate action, maintaining 100% mathematical parity.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

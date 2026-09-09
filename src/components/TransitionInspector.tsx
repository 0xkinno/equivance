"use client";

import React, { useState } from "react";
import { Clock, Play, AlertTriangle, ShieldCheck, ArrowRight, Zap, Check, FileCode2 } from "lucide-react";

export const TransitionInspector: React.FC = () => {
  const T = 1750000000; // Reference effectiveAt timestamp
  const [timestampOffset, setTimestampOffset] = useState<number>(0); // relative to T
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const currentTimestamp = T + timestampOffset;
  const isPostTransition = currentTimestamp >= T;
  const inGuardWindow = currentTimestamp < T && currentTimestamp >= T - 3600;

  // Multiplier logic
  const rawBalance = 1000; // 1,000 raw AAPLc units
  const effectiveMultiplier = isPostTransition ? 2.0 : 1.0;
  const uiShares = rawBalance * effectiveMultiplier;
  const equityPrice = isPostTransition ? 100.0 : 200.0; // Market price adjusts for 2-for-1 split
  const collateralValueUsd = uiShares * equityPrice;
  const ltv = inGuardWindow ? 0.70 : 0.75;
  const maxDebtUsd = collateralValueUsd * ltv;

  // Stale Indexer / Naive Protocol comparison
  const naiveMultiplier = 1.0; // Missed the eventless transition!
  const naiveUiShares = rawBalance * naiveMultiplier;
  const naiveCollateralValueUsd = naiveUiShares * equityPrice; // evaluates 1,000 shares @ $100 post-split = $100k
  const naiveMaxDebtUsd = naiveCollateralValueUsd * 0.75;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">Eventless Maturity Demonstration</div>
        <h2 className="font-serif text-3xl font-bold text-neutral-950 mt-1">
          B20 Scheduled Multiplier Time-Scrubber
        </h2>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">
          Move the block timestamp across the scheduled transition point <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">T = {T}</code>. Witness how <code className="font-mono text-xs font-bold text-blue-700">uiMultiplier()</code> lazily evaluates on read with <strong className="text-neutral-900 font-semibold">zero keeper transactions and zero state-mutating events</strong> at timestamp T.
        </p>
      </div>

      {/* Time-Scrubber Controls */}
      <div className="p-6 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-neutral-700" />
            <div>
              <div className="text-xs font-mono text-neutral-500">Virtual Block Timestamp</div>
              <div className="text-lg font-mono font-bold text-neutral-900">
                {currentTimestamp} <span className="text-xs font-normal text-neutral-500">({timestampOffset >= 0 ? `+${timestampOffset}s` : `${timestampOffset}s`} from T)</span>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <button
              onClick={() => setTimestampOffset(-3600)}
              className="px-3 py-1.5 rounded border border-neutral-200 hover:bg-neutral-50"
            >
              T - 1h (Guard Window)
            </button>
            <button
              onClick={() => setTimestampOffset(-1)}
              className="px-3 py-1.5 rounded border border-neutral-200 hover:bg-neutral-50"
            >
              T - 1s (Before Split)
            </button>
            <button
              onClick={() => setTimestampOffset(0)}
              className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold hover:bg-blue-700"
            >
              T = 0s (Exact Maturity)
            </button>
            <button
              onClick={() => setTimestampOffset(3600)}
              className="px-3 py-1.5 rounded border border-neutral-200 hover:bg-neutral-50"
            >
              T + 1h (Post-Split)
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min="-7200"
            max="7200"
            step="10"
            value={timestampOffset}
            onChange={(e) => setTimestampOffset(parseInt(e.target.value))}
            className="w-full accent-neutral-900 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-neutral-400">
            <span>T - 2h (Pre-Transition)</span>
            <span className="font-bold text-blue-700">Effective At (T = {T})</span>
            <span>T + 2h (Post-Transition)</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison: EQUIVANCE vs Stale Baseline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* EQUIVANCE Card */}
        <div className="p-6 rounded-lg bg-white border-2 border-emerald-500/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-serif text-lg font-bold text-neutral-950">EQUIVANCE (State-Coherent)</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              SOLVENT & COHERENT
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-3 rounded bg-neutral-50 border border-neutral-200">
              <div className="text-[10px] text-neutral-400 uppercase">Raw Token Units</div>
              <div className="text-base font-bold text-neutral-900 mt-1">{rawBalance.toLocaleString()} AAPLc</div>
              <div className="text-[10px] text-neutral-500">Unchanged in storage</div>
            </div>

            <div className="p-3 rounded bg-neutral-50 border border-neutral-200">
              <div className="text-[10px] text-neutral-400 uppercase">Live uiMultiplier()</div>
              <div className="text-base font-bold text-blue-700 mt-1">{effectiveMultiplier.toFixed(2)}x</div>
              <div className="text-[10px] text-neutral-500">Lazy evaluation on read</div>
            </div>

            <div className="p-3 rounded bg-neutral-50 border border-neutral-200">
              <div className="text-[10px] text-neutral-400 uppercase">UI Share Equivalent</div>
              <div className="text-base font-bold text-neutral-900 mt-1">{uiShares.toLocaleString()} shares</div>
              <div className="text-[10px] text-neutral-500">balanceOfUI(vault)</div>
            </div>

            <div className="p-3 rounded bg-neutral-50 border border-neutral-200">
              <div className="text-[10px] text-neutral-400 uppercase">Stock Price</div>
              <div className="text-base font-bold text-neutral-900 mt-1">${equityPrice.toFixed(2)}</div>
              <div className="text-[10px] text-neutral-500">Chainlink 24/5 Feed</div>
            </div>

            <div className="p-3 rounded bg-neutral-50 border border-neutral-200 col-span-2">
              <div className="text-[10px] text-neutral-400 uppercase">Collateral Value & Max Debt</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                ${collateralValueUsd.toLocaleString()} <span className="text-xs font-normal text-neutral-500">(Max Debt: ${maxDebtUsd.toLocaleString()})</span>
              </div>
              <div className="text-[10px] text-emerald-800 mt-1 font-semibold">
                ✓ Borrowing capacity correctly maintained across corporate action
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-emerald-50/60 border border-emerald-200 text-xs font-mono text-emerald-950 space-y-1">
            <div className="font-semibold flex items-center space-x-1">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>Onchain Transition Trace</span>
            </div>
            <div>• Operator Transition Transactions: <strong className="text-neutral-900">0</strong></div>
            <div>• Storage Writes at Timestamp T: <strong className="text-neutral-900">0</strong></div>
            <div>• Gas Overhead: <strong className="text-neutral-900">0 wei</strong></div>
          </div>
        </div>

        {/* Stale Indexer Baseline Card */}
        <div className="p-6 rounded-lg bg-white border-2 border-red-300 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-serif text-lg font-bold text-neutral-950">Naive / Cached Event Protocol</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-50 text-red-800 border border-red-200">
              {isPostTransition ? "DESYNCHRONIZED" : "VULNERABLE"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-3 rounded bg-neutral-50 border border-neutral-200">
              <div className="text-[10px] text-neutral-400 uppercase">Raw Token Units</div>
              <div className="text-base font-bold text-neutral-900 mt-1">{rawBalance.toLocaleString()} AAPLc</div>
              <div className="text-[10px] text-neutral-500">Unchanged in storage</div>
            </div>

            <div className="p-3 rounded bg-neutral-50 border border-neutral-200">
              <div className="text-[10px] text-neutral-400 uppercase">Cached Multiplier</div>
              <div className="text-base font-bold text-red-600 mt-1">{naiveMultiplier.toFixed(2)}x (STALE)</div>
              <div className="text-[10px] text-red-500">Missed eventless transition</div>
            </div>

            <div className="p-3 rounded bg-neutral-50 border border-neutral-200">
              <div className="text-[10px] text-neutral-400 uppercase">Evaluated Shares</div>
              <div className="text-base font-bold text-red-600 mt-1">{naiveUiShares.toLocaleString()} shares</div>
              <div className="text-[10px] text-red-500">50% undervaluation post-split</div>
            </div>

            <div className="p-3 rounded bg-neutral-50 border border-neutral-200">
              <div className="text-[10px] text-neutral-400 uppercase">Stock Price</div>
              <div className="text-base font-bold text-neutral-900 mt-1">${equityPrice.toFixed(2)}</div>
              <div className="text-[10px] text-neutral-500">Price halved by split</div>
            </div>

            <div className="p-3 rounded bg-neutral-50 border border-neutral-200 col-span-2">
              <div className="text-[10px] text-neutral-400 uppercase">Flawed Valuation & Borrow Cap</div>
              <div className="text-lg font-bold text-red-700 mt-1">
                ${naiveCollateralValueUsd.toLocaleString()} <span className="text-xs font-normal text-neutral-500">(Max Debt: ${naiveMaxDebtUsd.toLocaleString()})</span>
              </div>
              <div className="text-[10px] text-red-700 mt-1 font-semibold">
                {isPostTransition
                  ? "⚠ CRITICAL: Borrowers with $100k+ debt are wrongfully liquidated!"
                  : "Waiting for scheduled transition..."}
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-red-50/60 border border-red-200 text-xs font-mono text-red-950 space-y-1">
            <div className="font-semibold flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
              <span>Failure Mode Summary</span>
            </div>
            <div>• Event listener triggered at schedule time, but no event was emitted at maturity.</div>
            <div>• In reverse splits ($1.0 \to 0.5$), protocol mints 100% unbacked bad debt.</div>
            <div>• In forward splits ($1.0 \to 2.0$), solvent borrowers are unjustly liquidated.</div>
          </div>
        </div>

      </div>
    </div>
  );
};

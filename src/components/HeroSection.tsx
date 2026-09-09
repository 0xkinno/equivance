"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Activity, Terminal, CheckCircle2, AlertTriangle, Play } from "lucide-react";

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const [simStep, setSimStep] = useState<number>(0);

  const steps = [
    {
      title: "1. Raw Deposit Snapshot",
      desc: "Vault holds 1,000 raw AAPLc token units. Raw ERC-20 storage balance never rebases or mutates across corporate actions.",
      raw: "1,000 AAPLc",
      multiplier: "1.00x",
      shares: "1,000.00 shares",
      value: "$200,000 USD",
      maxDebt: "$150,000 (75% LTV)",
    },
    {
      title: "2. Corporate Action Scheduled",
      desc: "Issuer calls updateUIMultiplier(2.0e18, T). Multiplier is scheduled for timestamp T. Before T, live uiMultiplier() remains 1.0x.",
      raw: "1,000 AAPLc",
      multiplier: "1.00x (2.0x pending)",
      shares: "1,000.00 shares",
      value: "$200,000 USD",
      maxDebt: "$140,000 (Guard Window)",
    },
    {
      title: "3. Eventless Lazy Transition at T",
      desc: "Timestamp reaches T. NO transaction, NO event, NO rebase occurred. uiMultiplier() automatically evaluates to 2.0x on read.",
      raw: "1,000 AAPLc",
      multiplier: "2.00x (Effective)",
      shares: "2,000.00 shares",
      value: "$400,000 USD",
      maxDebt: "$300,000 (75% LTV)",
    },
  ];

  const current = steps[simStep];

  return (
    <section className="relative overflow-hidden pt-12 pb-20 border-b border-neutral-200/80 bg-[#FBFBF9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid: Headline & 3D Hero Prism */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Editorial Headline & Pitch (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-mono text-neutral-800">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>Base B20 / ERC-8056 Scaled UI Architecture</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-950 leading-[1.1]">
              Stock-backed credit that never desynchronizes.
            </h1>

            <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl font-sans">
              EQUIVANCE is the corporate-action-coherent credit layer for <strong className="text-neutral-900 font-semibold">Coinbase Tokenized Stocks on Base</strong>. When a stock split or corporate action alters a stock’s share-equivalent value without changing its raw token balance, EQUIVANCE keeps borrowing capacity mathematically sound.
            </p>

            {/* Invariant Banner */}
            <div className="p-4 rounded border border-amber-200/90 bg-amber-50/50 text-neutral-900 space-y-1 text-xs font-mono">
              <div className="flex items-center space-x-2 text-amber-900 font-semibold uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Primary Protocol Invariant</span>
              </div>
              <p className="text-neutral-700 text-xs leading-normal">
                No risk-changing operation may execute against a cached multiplier. Collateral valuation must use the B20 multiplier effective at the exact block timestamp of execution.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onNavigate("console")}
                className="px-5 py-3 rounded bg-neutral-950 text-white font-medium text-sm hover:bg-neutral-800 transition flex items-center space-x-2 shadow-sm"
              >
                <span>Open Live Position Console</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate("transition")}
                className="px-5 py-3 rounded border border-neutral-300 bg-white text-neutral-800 font-medium text-sm hover:bg-neutral-50 transition"
              >
                <span>Inspect Transition Mechanism</span>
              </button>
              <button
                onClick={() => onNavigate("attacks")}
                className="px-5 py-3 rounded border border-red-200 bg-red-50/60 text-red-900 font-medium text-sm hover:bg-red-100/60 transition"
              >
                <span>Attack Lab (5 Exploit Demos)</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Visual Artwork (5 Cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-lg overflow-hidden border border-neutral-200 shadow-sm bg-white p-2">
              <div className="relative w-full h-[340px] sm:h-[400px] overflow-hidden rounded">
                <Image
                  src="/hero_prism.jpg"
                  alt="EQUIVANCE Synchronized State Geometric Prism"
                  fill
                  className="object-cover object-center transform hover:scale-[1.02] transition duration-700"
                  priority
                />
              </div>
              <div className="p-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>Figure 1: Dual-State Geometric Equity Prism</span>
                <span className="text-neutral-900 font-semibold">Raw Token ↔ Scaled UI</span>
              </div>
            </div>
          </div>
        </div>

        {/* 20-Second Interactive Mechanism Visualizer */}
        <div className="mt-16 pt-12 border-t border-neutral-200/80">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">20-Second Mechanism Tour</div>
              <h2 className="font-serif text-2xl font-bold text-neutral-950 mt-1">
                How EQUIVANCE solves eventless maturity
              </h2>
            </div>
            {/* Step Controls */}
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setSimStep(idx)}
                  className={`px-3 py-1 rounded text-xs font-mono transition ${
                    simStep === idx
                      ? "bg-neutral-900 text-white font-bold"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  Step {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Card */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 space-y-3">
              <div className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px] font-mono font-medium">
                {current.title}
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed font-sans">
                {current.desc}
              </p>
              <div className="pt-2 text-xs font-mono text-neutral-500 flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Base EVM: Zero keeper tx required</span>
              </div>
            </div>

            <div className="md:col-span-7 bg-neutral-50 rounded border border-neutral-200/80 p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-white rounded border border-neutral-200/60">
                <div className="text-[10px] text-neutral-400 uppercase">Raw Token Balance</div>
                <div className="text-sm font-bold text-neutral-900 mt-1">{current.raw}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">balanceOf(vault)</div>
              </div>

              <div className="p-3 bg-white rounded border border-neutral-200/60">
                <div className="text-[10px] text-neutral-400 uppercase">Live UI Multiplier</div>
                <div className="text-sm font-bold text-blue-700 mt-1">{current.multiplier}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">uiMultiplier()</div>
              </div>

              <div className="p-3 bg-white rounded border border-neutral-200/60">
                <div className="text-[10px] text-neutral-400 uppercase">Share-Equivalent</div>
                <div className="text-sm font-bold text-neutral-900 mt-1">{current.shares}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">balanceOfUI(vault)</div>
              </div>

              <div className="p-3 bg-white rounded border border-neutral-200/60">
                <div className="text-[10px] text-neutral-400 uppercase">Collateral Value</div>
                <div className="text-sm font-bold text-emerald-700 mt-1">{current.value}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">@ $200.00 / share</div>
              </div>

              <div className="p-3 bg-white rounded border border-neutral-200/60 col-span-2 sm:col-span-2">
                <div className="text-[10px] text-neutral-400 uppercase">Allowable Borrow Capacity</div>
                <div className="text-sm font-bold text-neutral-900 mt-1">{current.maxDebt}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">Derived strictly from live state</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

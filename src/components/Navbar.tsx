"use client";

import React from "react";
import { ShieldCheck, Activity, Cpu, ArrowUpRight } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="sticky top-0 z-50 bg-[#FBFBF9]/90 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("landing")}>
          <div className="w-8 h-8 rounded-none border border-neutral-900 bg-neutral-900 flex items-center justify-center text-white font-mono text-sm font-bold tracking-tighter">
            EQ
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-lg font-bold tracking-tight text-neutral-900">EQUIVANCE</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                BASE B20
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 font-mono tracking-wide">CORPORATE-ACTION CREDIT LAYER</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {[
            { id: "landing", label: "Overview" },
            { id: "console", label: "Live Position" },
            { id: "transition", label: "Transition Inspector" },
            { id: "attacks", label: "Attack Lab" },
            { id: "benchmark", label: "Baseline Benchmark" },
            { id: "verifier", label: "Clean-Room Verifier" },
            { id: "sponsor", label: "Base B20 Primitive" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === item.id
                  ? "text-neutral-900 border-b-2 border-neutral-900 font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Live Network Pill */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded border border-emerald-200 bg-emerald-50/60 text-emerald-800 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Base 8453 Coherent</span>
          </div>
          <button
            onClick={() => setActiveTab("console")}
            className="px-3.5 py-1.5 rounded bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition shadow-sm flex items-center space-x-1"
          >
            <span>Launch Console</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

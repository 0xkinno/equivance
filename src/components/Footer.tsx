"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200 bg-white py-12 mt-auto text-xs font-mono text-neutral-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-neutral-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
              EQ
            </div>
            <span className="font-serif text-sm font-bold text-neutral-900">EQUIVANCE</span>
            <span className="text-neutral-400">|</span>
            <span>Corporate-Action-Coherent Credit for Base</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span>Base Chain ID: 8453</span>
            <span>Standard: B20 / ERC-8056</span>
            <span>Oracles: Chainlink 24/5 Streams</span>
          </div>
        </div>

        <div className="pt-6 border-t border-neutral-100 text-[11px] text-neutral-400 leading-relaxed font-sans">
          <p>
            <strong>Regulatory & Compliance Notice:</strong> EQUIVANCE is open-source protocol infrastructure for eligible non-US users holding tokenized securities issued under applicable local regulatory frameworks. EQUIVANCE does not broker or underwrite securities. All credit actions evaluate smart contract math deterministically.
          </p>
        </div>
      </div>
    </footer>
  );
};

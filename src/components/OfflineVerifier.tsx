"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, FileJson, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
const { verifyEvidenceBundle } = require("../../verifier/verifier_core");

interface VerificationEvidenceBundle {
  chainId: number;
  blockNumber: number;
  blockTimestamp: number;
  asset: string;
  rawBalance: string;
  currentMultiplier: string;
  pendingMultiplier?: string;
  effectiveAt?: number;
  oraclePrice: string;
  oracleDecimals: number;
  assetDecimals: number;
  oracleUpdatedAt: number;
  ltvBps: number;
  liquidationThresholdBps: number;
  debtAmountUsd: string;
  expectedState?: {
    effectiveMultiplier: string;
    uiAmount: string;
    collateralValueUsd: string;
    maxDebtUsd: string;
    healthFactor: string;
    status: string;
  };
}

interface VerificationReport {
  status: "PASS" | "FAIL" | "UNKNOWN";
  timestamp: string;
  reasons: string[];
  recomputed: {
    effectiveMultiplier: string;
    uiAmount: string;
    collateralValueUsd: string;
    maxDebtUsd: string;
    healthFactor: string;
    status: string;
  };
}

const sampleValidBundle: VerificationEvidenceBundle = {
  chainId: 8453,
  blockNumber: 22450100,
  blockTimestamp: 1750000000,
  asset: "0x4B384A96BEaB552F2f6385d532881267D5a7e6b0",
  rawBalance: "1000000000000000000000", // 1,000 raw AAPLc tokens (18 dec)
  currentMultiplier: "1000000000000000000", // 1.0x
  pendingMultiplier: "2000000000000000000", // 2.0x
  effectiveAt: 1750000000,
  oraclePrice: "20000000000", // $200.00 (8 dec)
  oracleDecimals: 8,
  assetDecimals: 18,
  oracleUpdatedAt: 1750000000,
  ltvBps: 7500,
  liquidationThresholdBps: 8500,
  debtAmountUsd: "150000000000000000000000", // $150,000 debt
  expectedState: {
    effectiveMultiplier: "2000000000000000000",
    uiAmount: "2000000000000000000000",
    collateralValueUsd: "400000000000000000000000",
    maxDebtUsd: "300000000000000000000000",
    healthFactor: "2266666666666666666", // 2.26x
    status: "COHERENT",
  },
};

const sampleTamperedBundle: VerificationEvidenceBundle = {
  ...sampleValidBundle,
  expectedState: {
    ...sampleValidBundle.expectedState!,
    effectiveMultiplier: "1000000000000000000", // Stale multiplier claim!
  },
};

export const OfflineVerifier: React.FC = () => {
  const [inputJson, setInputJson] = useState<string>(JSON.stringify(sampleValidBundle, null, 2));
  const [report, setReport] = useState<any>(() => verifyEvidenceBundle(sampleValidBundle));

  const handleVerify = () => {
    try {
      const parsed = JSON.parse(inputJson);
      const res = verifyEvidenceBundle(parsed);
      setReport(res);
    } catch (e: any) {
      setReport({
        status: "FAIL",
        timestamp: new Date().toISOString(),
        reasons: [`JSON Syntax Error: ${e.message}`],
        recomputed: {} as any,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">Clean-Room Verification</div>
        <h2 className="font-serif text-3xl font-bold text-neutral-950 mt-1">
          Offline Position & Evidence Verifier
        </h2>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">
          Independently recomputes fixed-point valuation from committed onchain evidence bundles using pure 18-decimal reference mathematics.
        </p>
      </div>

      {/* Preset Pickers */}
      <div className="flex items-center space-x-3 text-xs font-mono">
        <span className="text-neutral-500">Load Preset Bundle:</span>
        <button
          onClick={() => {
            setInputJson(JSON.stringify(sampleValidBundle, null, 2));
            setReport(verifyEvidenceBundle(sampleValidBundle));
          }}
          className="px-3 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
        >
          ✓ Valid 2-for-1 Split Evidence
        </button>
        <button
          onClick={() => {
            setInputJson(JSON.stringify(sampleTamperedBundle, null, 2));
            setReport(verifyEvidenceBundle(sampleTamperedBundle));
          }}
          className="px-3 py-1 rounded bg-red-50 hover:bg-red-100 text-red-800 border border-red-200"
        >
          ❌ Tampered Stale Multiplier Evidence
        </button>
      </div>

      {/* Main Grid: Input JSON vs Mathematical Proof Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Evidence JSON Input (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-600">
            <span className="font-bold">Onchain Evidence Bundle (JSON)</span>
            <span>Signed / Committed Block Data</span>
          </div>
          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            rows={18}
            className="w-full p-4 rounded-lg bg-neutral-950 text-neutral-100 font-mono text-xs border border-neutral-800 focus:outline-none focus:border-neutral-600 leading-relaxed"
            spellCheck={false}
          />
          <button
            onClick={handleVerify}
            className="w-full py-3 rounded bg-neutral-950 text-white text-xs font-mono font-bold hover:bg-neutral-800 transition flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Recompute Reference Verification</span>
          </button>
        </div>

        {/* Right Column: Mathematical Proof & Verdict (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Status Verdict Banner */}
          {report && (
            <div
              className={`p-5 rounded-lg border shadow-sm space-y-3 ${
                report.status === "PASS"
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                  : report.status === "FAIL"
                  ? "bg-red-50/80 border-red-300 text-red-950"
                  : "bg-amber-50/80 border-amber-300 text-amber-950"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {report.status === "PASS" ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : report.status === "FAIL" ? (
                    <XCircle className="w-6 h-6 text-red-600" />
                  ) : (
                    <HelpCircle className="w-6 h-6 text-amber-600" />
                  )}
                  <span className="font-serif text-xl font-bold">
                    VERDICT: [{report.status}]
                  </span>
                </div>
                <span className="text-[10px] font-mono opacity-70">{report.timestamp}</span>
              </div>

              <div className="space-y-1 text-xs font-mono">
                {report.reasons && report.reasons.map((r: string, idx: number) => (
                  <div key={idx}>• {r}</div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Recomputed Metrics Table */}
          {report && report.recomputed && (
            <div className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-4 font-mono text-xs">
              <h4 className="font-serif text-base font-bold text-neutral-950 border-b border-neutral-100 pb-2">
                Clean-Room Step-by-Step Proof
              </h4>

              <div className="space-y-3 text-neutral-800">
                <div className="flex justify-between border-b border-neutral-50 pb-1.5">
                  <span className="text-neutral-500">1. Effective Multiplier:</span>
                  <span className="font-bold text-blue-700">
                    {(BigInt(report.recomputed.effectiveMultiplier || "0") / (10n ** 18n)).toString()}x ({report.recomputed.effectiveMultiplier} wei)
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-50 pb-1.5">
                  <span className="text-neutral-500">2. Scaled UI Shares:</span>
                  <span className="font-bold">
                    {(BigInt(report.recomputed.uiAmount || "0") / (10n ** 18n)).toString()} shares
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-50 pb-1.5">
                  <span className="text-neutral-500">3. Collateral Valuation:</span>
                  <span className="font-bold text-emerald-700">
                    ${(BigInt(report.recomputed.collateralValueUsd || "0") / (10n ** 18n)).toLocaleString()} USD
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-50 pb-1.5">
                  <span className="text-neutral-500">4. Max Safe Debt Limit:</span>
                  <span className="font-bold">
                    ${(BigInt(report.recomputed.maxDebtUsd || "0") / (10n ** 18n)).toLocaleString()} USD
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-50 pb-1.5">
                  <span className="text-neutral-500">5. Health Factor:</span>
                  <span className="font-bold">
                    {(Number(BigInt(report.recomputed.healthFactor || "0")) / 1e18).toFixed(2)} WAD
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-500">6. Derived Risk Status:</span>
                  <span className="font-bold text-neutral-950">{report.recomputed.status}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

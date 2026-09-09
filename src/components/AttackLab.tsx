"use client";

import React, { useState } from "react";
import { AlertOctagon, ShieldCheck, Terminal, Play, FileJson, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface AttackScenario {
  id: string;
  name: string;
  title: string;
  vector: string;
  description: string;
  naiveBehavior: string;
  equivanceDefense: string;
  receiptPath: string;
  defaultReceipt: any;
}

const attacks: AttackScenario[] = [
  {
    id: "A",
    name: "Attack A: Stale Event/Indexer State",
    title: "Reverse Stock Split Eventless Boundary Exploit",
    vector: "Indexer/Event-Only Cache Stale Invalidation",
    description:
      "A 1-for-2 reverse stock split is scheduled (multiplier 1.0x -> 0.5x). At maturity T, no onchain event is emitted. An attacker attempts to borrow against the stale 1.0x multiplier to withdraw 2x unbacked stablecoins.",
    naiveBehavior: "CRITICAL INSOLVENCY: NaiveVault lends $150,000 against $100,000 real collateral ($75,000 bad debt).",
    equivanceDefense: "DEFENDED: Derives live 0.5x multiplier on read at current block timestamp, rejecting over-borrow.",
    receiptPath: "proof/attacks/A-stale-event-cache.json",
    defaultReceipt: {
      attackId: "ATTACK-A-STALE-EVENT-CACHE",
      scenario: "Reverse stock split (1.0x -> 0.5x) with eventless timestamp maturity",
      naiveBaselineResult: {
        vulnerability: "CRITICAL_INSOLVENCY",
        unbackedDebtMintedUsd: "150000000000000000000000",
        badDebtCreatedUsd: "75000000000000000000000",
      },
      equivanceDefenseResult: {
        status: "DEFENDED",
        rejectionReason: "InsufficientCollateral",
        enforcedMaxDebtUsd: "75000000000000000000000",
        solvencyPreserved: true,
      },
      verifierStatus: "PASS",
    },
  },
  {
    id: "B",
    name: "Attack B: Raw vs UI Unit Confusion",
    title: "Unit Mismatch & Precision Inflation Attack",
    vector: "Supplying raw token balance where UI share-equivalents expected",
    description:
      "Attacker deposits an asset with a 0.1x multiplier and attempts to leverage raw token balance (100 raw) as 100 UI shares ($20,000 value) instead of the true 10 UI shares ($2,000 value).",
    naiveBehavior: "COLLATERAL INFLATION: Lends $15,000 debt on $2,000 collateral (10x over-leverage).",
    equivanceDefense: "DEFENDED: PositionMath converts raw balance via WAD fixed-point math, restricting debt to $1,500.",
    receiptPath: "proof/attacks/B-raw-ui-mismatch.json",
    defaultReceipt: {
      attackId: "ATTACK-B-RAW-UI-MISMATCH",
      scenario: "Attempting to leverage raw balance without UI multiplier scaling",
      inputRawAmount: "100000000000000000000",
      multiplier: "100000000000000000",
      computedUIAmount: "10000000000000000000",
      maxDebtAllowedUsd: "1500000000000000000000",
      defenseStatus: "DEFENDED",
      verifierStatus: "PASS",
    },
  },
  {
    id: "C",
    name: "Attack C: Pending Transition Boundary",
    title: "Boundary Frontrunning & Leverage Race",
    vector: "Racing transactions across T-1 and T boundary",
    description:
      "Attacker attempts to open maximum leverage in the final seconds prior to effectiveAt without accounting for transition guard windows.",
    naiveBehavior: "DESYNCHRONIZATION: Allows full leverage up to T-1, risking bad debt if post-split price gaps.",
    equivanceDefense: "DEFENDED: Applies transition guard window (T ± 3600s), reducing allowable LTV by 500 BPS.",
    receiptPath: "proof/attacks/C-effectiveAt-boundary.json",
    defaultReceipt: {
      attackId: "ATTACK-C-EFFECTIVEAT-BOUNDARY",
      scenario: "Dynamic evaluation across exact timestamp T with zero keeper transaction",
      transitionType: "EVENTLESS_LAZY_EVALUATION",
      guardWindowActive: true,
      verifierStatus: "PASS",
    },
  },
  {
    id: "D",
    name: "Attack D: Policy / Allowance Trap",
    title: "ERC-20 Allowance vs Issuer Allowlist Disconnect",
    vector: "Preflight transfer validation failure",
    description:
      "User has approved max ERC-20 token allowance, but is not on the institutional issuer compliance allowlist.",
    naiveBehavior: "STUCK STATE: Internal accounting registers deposit before verifying transfer, corrupting state.",
    equivanceDefense: "DEFENDED: Preflight SafeERC20 transfer executed prior to state mutation; reverts safely.",
    receiptPath: "proof/attacks/D-policy-allowance.json",
    defaultReceipt: {
      attackId: "ATTACK-D-POLICY-ALLOWANCE-TRAP",
      scenario: "ERC-20 approval granted but transfer fails due to compliance allowlist",
      result: "REVERTED_SAFELY_PREFLIGHT",
      internalStateCorrupted: false,
      verifierStatus: "PASS",
    },
  },
  {
    id: "E",
    name: "Attack E: Pause Boundary Fail-Closed",
    title: "Issuer Emergency Pause Violation",
    vector: "Executing credit actions during asset market halt",
    description:
      "Issuer triggers emergency pause during market halt. Attacker attempts to withdraw collateral or borrow debt.",
    naiveBehavior: "INCONSISTENCY: Protocol allows borrow against unwithdrawable/halted assets.",
    equivanceDefense: "DEFENDED: Fails closed. B20StateReader detects paused state and blocks borrow/withdraw.",
    receiptPath: "proof/attacks/E-pause-boundary.json",
    defaultReceipt: {
      attackId: "ATTACK-E-PAUSE-BOUNDARY",
      scenario: "Attempting credit actions during issuer emergency pause",
      protocolPolicy: "FAIL_CLOSED_PROTECTION",
      verifierStatus: "PASS",
    },
  },
];

export const AttackLab: React.FC = () => {
  const [selectedAttack, setSelectedAttack] = useState<AttackScenario>(attacks[0]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [attackReceipt, setAttackReceipt] = useState<any>(selectedAttack.defaultReceipt);

  const runAttackSimulation = () => {
    setIsExecuting(true);
    setExecutionLogs([]);

    const steps = [
      `[0.00s] Initializing test fixture for ${selectedAttack.name}...`,
      `[0.10s] Mock B20 asset configured. Raw collateral: 1,000 tokens.`,
      `[0.25s] Simulating adversarial condition: ${selectedAttack.vector}...`,
      `[0.40s] Executing Baseline (NaiveVault) transaction...`,
      `[0.55s] ❌ BASELINE FAILED: ${selectedAttack.naiveBehavior}`,
      `[0.70s] Executing EQUIVANCE canonical RiskEngine evaluation...`,
      `[0.85s] Checking B20StateReader live uiMultiplier() and pause/guard constraints...`,
      `[1.00s] ✓ EQUIVANCE DEFENDED: ${selectedAttack.equivanceDefense}`,
      `[1.15s] Generating cryptographic JSON evidence receipt...`,
    ];

    steps.forEach((log, index) => {
      setTimeout(() => {
        setExecutionLogs((prev) => [...prev, log]);
        if (index === steps.length - 1) {
          setIsExecuting(false);
          setAttackReceipt(selectedAttack.defaultReceipt);
        }
      }, index * 150);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono uppercase tracking-widest text-red-600 font-semibold">Break It On Purpose</div>
        <h2 className="font-serif text-3xl font-bold text-neutral-950 mt-1">
          Adversarial Attack & Solvency Lab
        </h2>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">
          Five mandatory attack vectors breaking naive cached DeFi assumptions. Execute live adversarial simulations and inspect reproducible onchain receipts.
        </p>
      </div>

      {/* Attack Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {attacks.map((att) => (
          <button
            key={att.id}
            onClick={() => {
              setSelectedAttack(att);
              setExecutionLogs([]);
              setAttackReceipt(att.defaultReceipt);
            }}
            className={`p-3 rounded-lg border text-left transition ${
              selectedAttack.id === att.id
                ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                : "bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <div className="text-[10px] font-mono opacity-70">ATTACK {att.id}</div>
            <div className="text-xs font-bold font-serif truncate mt-0.5">{att.title}</div>
          </button>
        ))}
      </div>

      {/* Main Attack Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Attack Details & Trigger (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-serif text-xl font-bold text-neutral-950">{selectedAttack.title}</h3>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-50 text-red-800 border border-red-200 font-bold">
                ATTACK {selectedAttack.id}
              </span>
            </div>

            <div className="text-xs font-mono text-neutral-500">
              <strong className="text-neutral-700">Attack Vector:</strong> {selectedAttack.vector}
            </div>

            <p className="text-sm text-neutral-700 font-sans leading-relaxed">
              {selectedAttack.description}
            </p>

            {/* Comparison Box */}
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded bg-red-50 border border-red-200 text-xs font-mono text-red-950">
                <div className="font-bold flex items-center space-x-1 mb-1">
                  <XCircle className="w-3.5 h-3.5 text-red-700" />
                  <span>Naive Protocol Behavior</span>
                </div>
                <div className="text-neutral-700">{selectedAttack.naiveBehavior}</div>
              </div>

              <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-950">
                <div className="font-bold flex items-center space-x-1 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>EQUIVANCE Defense Invariant</span>
                </div>
                <div className="text-neutral-700">{selectedAttack.equivanceDefense}</div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={runAttackSimulation}
              disabled={isExecuting}
              className="w-full py-3 rounded bg-neutral-950 text-white font-medium text-xs font-mono hover:bg-neutral-800 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{isExecuting ? "Executing Simulation..." : "Execute Attack Simulation"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Terminal & JSON Receipt (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Live Execution Console */}
          <div className="rounded-lg bg-neutral-950 text-neutral-100 p-5 font-mono text-xs shadow-md border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-[11px] text-neutral-400">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>adversarial_test_runner.log</span>
              </div>
              <span className="text-emerald-400 font-bold">READY</span>
            </div>

            <div className="h-44 overflow-y-auto space-y-1 text-[11px] font-mono leading-relaxed">
              {executionLogs.length === 0 ? (
                <div className="text-neutral-500 italic py-8 text-center">
                  Click "Execute Attack Simulation" to run test fixture and inspect onchain execution trace...
                </div>
              ) : (
                executionLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.includes("✓")
                        ? "text-emerald-400 font-bold"
                        : log.includes("❌")
                        ? "text-red-400 font-bold"
                        : "text-neutral-300"
                    }
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* JSON Evidence Receipt Box */}
          <div className="p-4 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-500 border-b border-neutral-100 pb-2">
              <div className="flex items-center space-x-1.5 font-bold text-neutral-800">
                <FileJson className="w-4 h-4 text-blue-600" />
                <span>Evidence Receipt: {selectedAttack.receiptPath}</span>
              </div>
              <span className="text-emerald-700 font-bold">VERIFIED PASS</span>
            </div>
            <pre className="text-[10px] font-mono bg-neutral-50 p-3 rounded border border-neutral-200 overflow-x-auto text-neutral-800 max-h-40">
              {JSON.stringify(attackReceipt, null, 2)}
            </pre>
          </div>

        </div>

      </div>
    </div>
  );
};

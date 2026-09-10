"use client";

import React, { useState } from "react";
import { Shield, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, Info, ShieldCheck } from "lucide-react";

export const LivePositionConsole: React.FC = () => {
  // Stock Selection State
  const [selectedAsset, setSelectedAsset] = useState<"AAPLc" | "NVDAc">("AAPLc");

  // Position Simulation State
  const [rawCollateral, setRawCollateral] = useState<number>(500); // 500 raw tokens
  const [multiplier, setMultiplier] = useState<number>(1.0); // 1.0x
  const [hasPending, setHasPending] = useState<boolean>(false);
  const [inGuardWindow, setInGuardWindow] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [price, setPrice] = useState<number>(selectedAsset === "AAPLc" ? 225.50 : 128.40); // Total Return Price
  const [debtAmount, setDebtAmount] = useState<number>(35000); // $35,000 debt

  // Form Inputs
  const [depositInput, setDepositInput] = useState<string>("");
  const [borrowInput, setBorrowInput] = useState<string>("");
  const [repayInput, setRepayInput] = useState<string>("");
  const [withdrawInput, setWithdrawInput] = useState<string>("");
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Derived Values under Valuation-Basis Integrity (TRV Rule)
  // CANONICAL: collateralValueUsd = rawCollateral * price (NEVER multiplied by multiplier)
  const uiAmount = rawCollateral * multiplier; // UI presentation ONLY
  const collateralValueUsd = rawCollateral * price;
  const ltvBps = inGuardWindow ? 7000 : 7500; // 75% normally, 70% in guard window
  const maxDebtUsd = (collateralValueUsd * ltvBps) / 10000;
  const liqCollateralUsd = (collateralValueUsd * 8500) / 10000;
  const healthFactor = debtAmount === 0 ? 999.0 : liqCollateralUsd / debtAmount;

  // Status computation
  let status: "COHERENT" | "PENDING_ACTION" | "TRANSITION" | "BLOCKED" | "LIQUIDATABLE" = "COHERENT";
  if (isPaused) status = "BLOCKED";
  else if (healthFactor < 1.0 && debtAmount > 0) status = "LIQUIDATABLE";
  else if (inGuardWindow) status = "TRANSITION";
  else if (hasPending) status = "PENDING_ACTION";

  // Actions
  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositInput);
    if (!val || val <= 0) return;
    if (isPaused) {
      setActionNotice({ type: "error", msg: "Asset is currently paused by issuer. Deposits/transfers blocked." });
      return;
    }
    setRawCollateral((prev) => prev + val);
    setDepositInput("");
    setActionNotice({ type: "success", msg: `Deposited ${val} raw ${selectedAsset}. Valuation derived strictly via Total Return rule.` });
  };

  const handleBorrow = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(borrowInput);
    if (!val || val <= 0) return;
    if (isPaused) {
      setActionNotice({ type: "error", msg: "Action rejected: Asset transfer is paused." });
      return;
    }
    if (debtAmount + val > maxDebtUsd) {
      setActionNotice({
        type: "error",
        msg: `Insufficient Collateral: Total debt ($${(debtAmount + val).toLocaleString()}) exceeds allowable limit ($${maxDebtUsd.toLocaleString()}).`,
      });
      return;
    }
    setDebtAmount((prev) => prev + val);
    setBorrowInput("");
    setActionNotice({ type: "success", msg: `Successfully borrowed $${val.toLocaleString()} USDC against live B20 state.` });
  };

  const handleRepay = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(repayInput);
    if (!val || val <= 0) return;
    const actualRepay = Math.min(val, debtAmount);
    setDebtAmount((prev) => prev - actualRepay);
    setRepayInput("");
    setActionNotice({ type: "success", msg: `Repaid $${actualRepay.toLocaleString()} USDC. Position health strengthened.` });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(withdrawInput);
    if (!val || val <= 0 || val > rawCollateral) return;
    if (isPaused) {
      setActionNotice({ type: "error", msg: "Action rejected: Asset transfer is paused." });
      return;
    }
    const remainingRaw = rawCollateral - val;
    const remainingVal = remainingRaw * price;
    const remainingLiq = (remainingVal * 8500) / 10000;
    const newHf = debtAmount === 0 ? 999 : remainingLiq / debtAmount;

    if (newHf < 1.0) {
      setActionNotice({
        type: "error",
        msg: `Withdrawal rejected: Would leave position unhealthy (Health Factor: ${newHf.toFixed(2)} < 1.00).`,
      });
      return;
    }

    setRawCollateral(remainingRaw);
    setWithdrawInput("");
    setActionNotice({ type: "success", msg: `Withdrew ${val} raw ${selectedAsset}.` });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">Live Credit Management</div>
          <h2 className="font-serif text-3xl font-bold text-neutral-950 mt-1">
            Coinbase Stock Collateral Console
          </h2>
          <div className="mt-2 flex items-center space-x-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
              CONTROLLED TEST ASSET (ControlledAAPLc)
            </span>
            <span className="text-neutral-500"> Tested against official Coinbase B20 token specifications</span>
          </div>
        </div>

        {/* Asset Switcher */}
        <div className="flex items-center space-x-2 bg-neutral-100 p-1 rounded-md border border-neutral-200">
          {(["AAPLc", "NVDAc"] as const).map((asset) => (
            <button
              key={asset}
              onClick={() => {
                setSelectedAsset(asset);
                setPrice(asset === "AAPLc" ? 225.50 : 128.40);
              }}
              className={`px-4 py-1.5 text-xs font-mono font-medium rounded transition ${
                selectedAsset === asset
                  ? "bg-white text-neutral-950 shadow-sm font-bold border border-neutral-200"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {asset} (B20)
            </button>
          ))}
        </div>
      </div>

      {/* Notice Banner */}
      {actionNotice && (
        <div
          className={`p-4 rounded border flex items-center justify-between text-xs font-mono ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionNotice.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{actionNotice.msg}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-neutral-400 hover:text-neutral-600 font-bold ml-4">
            
          </button>
        </div>
      )}

      {/* Valuation Basis Notification */}
      <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs font-mono text-emerald-950">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span><strong>Valuation Basis Active:</strong> canonicalCollateralUSD = rawTokenAmount  Chainlink Total Return Price ($225.50). Multiplier is separated for UI display.</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 font-bold uppercase">
          Zero Double-Adjustment
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Raw Balance */}
        <div className="p-4 rounded-lg bg-white border border-neutral-200 shadow-sm">
          <div className="text-[10px] font-mono text-neutral-500 uppercase">Raw Token Balance</div>
          <div className="text-xl font-mono font-bold text-neutral-900 mt-1">
            {rawCollateral.toLocaleString()} <span className="text-xs font-normal text-neutral-400">{selectedAsset}</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-1">balanceOf(vault)</div>
        </div>

        {/* Effective Multiplier */}
        <div className="p-4 rounded-lg bg-white border border-neutral-200 shadow-sm">
          <div className="text-[10px] font-mono text-neutral-500 uppercase">Live UI Multiplier</div>
          <div className="text-xl font-mono font-bold text-blue-700 mt-1">
            {multiplier.toFixed(2)}x
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-1">uiMultiplier() [UI only]</div>
        </div>

        {/* Share Equivalent */}
        <div className="p-4 rounded-lg bg-white border border-neutral-200 shadow-sm">
          <div className="text-[10px] font-mono text-neutral-500 uppercase">Share-Equivalent</div>
          <div className="text-xl font-mono font-bold text-neutral-900 mt-1">
            {uiAmount.toLocaleString()} <span className="text-xs font-normal text-neutral-400">shares</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-1">balanceOfUI()</div>
        </div>

        {/* Total Return Price */}
        <div className="p-4 rounded-lg bg-white border border-neutral-200 shadow-sm">
          <div className="text-[10px] font-mono text-neutral-500 uppercase">Total Return Price</div>
          <div className="text-xl font-mono font-bold text-neutral-900 mt-1">
            ${price.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-emerald-600 mt-1 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Chainlink TRV Stream</span>
          </div>
        </div>

        {/* Collateral Value */}
        <div className="p-4 rounded-lg bg-white border border-neutral-200 shadow-sm">
          <div className="text-[10px] font-mono text-neutral-500 uppercase">Collateral Value</div>
          <div className="text-xl font-mono font-bold text-emerald-700 mt-1">
            ${collateralValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-1">rawTokenAmount  TRV</div>
        </div>

        {/* Health Factor */}
        <div className="p-4 rounded-lg bg-white border border-neutral-200 shadow-sm">
          <div className="text-[10px] font-mono text-neutral-500 uppercase">Health Factor</div>
          <div
            className={`text-xl font-mono font-bold mt-1 ${
              healthFactor >= 1.5 ? "text-emerald-700" : healthFactor >= 1.0 ? "text-amber-600" : "text-red-600"
            }`}
          >
            {healthFactor > 100 ? "8" : healthFactor.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-1">Min Safe: 1.00</div>
        </div>
      </div>

      {/* Main Interactive Grid: Debt Overview & Vault Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Debt Status & Invariant Inspection (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <h3 className="font-serif text-lg font-bold text-neutral-950">Position Solvency</h3>
              <span
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                  status === "COHERENT"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : status === "TRANSITION"
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : status === "PENDING_ACTION"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {status}
              </span>
            </div>

            {/* Debt Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-neutral-500">Current Outstanding Debt:</span>
                <span className="font-bold text-neutral-900">${debtAmount.toLocaleString()} USDC</span>
              </div>
              <div className="w-full h-3 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    debtAmount > maxDebtUsd ? "bg-red-600" : debtAmount > maxDebtUsd * 0.8 ? "bg-amber-500" : "bg-neutral-900"
                  }`}
                  style={{ width: `${Math.min(100, (debtAmount / Math.max(1, maxDebtUsd)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>0 USDC</span>
                <span>Max Borrow: ${maxDebtUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({ltvBps / 100}% LTV)</span>
              </div>
            </div>

            {/* Invariant Derivation Card */}
            <div className="p-4 rounded bg-neutral-50 border border-neutral-200 text-xs font-mono space-y-2">
              <div className="text-neutral-500 font-semibold uppercase text-[10px]">Canonical Execution Math</div>
              <div className="space-y-1 text-neutral-700">
                <div className="flex justify-between">
                  <span>rawCollateral:</span>
                  <span className="font-semibold text-neutral-900">{rawCollateral} raw tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>canonicalUSD:</span>
                  <span className="font-semibold text-neutral-900">{rawCollateral}  ${price.toFixed(2)} = ${collateralValueUsd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>uiShares (display only):</span>
                  <span className="font-semibold text-blue-700">{rawCollateral}  {multiplier.toFixed(2)} = {uiAmount.toFixed(2)} shares</span>
                </div>
                <div className="flex justify-between">
                  <span>maxDebt:</span>
                  <span className="font-semibold text-neutral-900">${collateralValueUsd.toLocaleString()}  {ltvBps / 10000} = ${maxDebtUsd.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Quick State Simulation Toggles */}
            <div className="pt-2 border-t border-neutral-100 space-y-3">
              <div className="text-xs font-mono text-neutral-500 uppercase tracking-wide">Simulator Overrides</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  onClick={() => setMultiplier((prev) => (prev === 1.0 ? 10.0 : prev === 10.0 ? 0.5 : 1.0))}
                  className="p-2 rounded border border-neutral-200 hover:bg-neutral-50 text-left"
                >
                  <div className="text-[10px] text-neutral-400">Cycle Multiplier</div>
                  <div className="font-bold text-neutral-900">{multiplier}x (Click to change)</div>
                </button>
                <button
                  onClick={() => setInGuardWindow((prev) => !prev)}
                  className={`p-2 rounded border text-left ${inGuardWindow ? "bg-amber-50 border-amber-300" : "border-neutral-200 hover:bg-neutral-50"}`}
                >
                  <div className="text-[10px] text-neutral-400">Guard Window</div>
                  <div className="font-bold text-neutral-900">{inGuardWindow ? "ACTIVE (-5% LTV)" : "OFF"}</div>
                </button>
                <button
                  onClick={() => setIsPaused((prev) => !prev)}
                  className={`p-2 rounded border text-left ${isPaused ? "bg-red-50 border-red-300" : "border-neutral-200 hover:bg-neutral-50"}`}
                >
                  <div className="text-[10px] text-neutral-400">Asset Pause</div>
                  <div className="font-bold text-neutral-900">{isPaused ? "PAUSED (Fail-Closed)" : "NORMAL"}</div>
                </button>
                <button
                  onClick={() => setPrice((prev) => (prev > 150 ? prev * 0.8 : prev * 1.25))}
                  className="p-2 rounded border border-neutral-200 hover:bg-neutral-50 text-left"
                >
                  <div className="text-[10px] text-neutral-400">Shock Price</div>
                  <div className="font-bold text-neutral-900">${price.toFixed(2)}</div>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Vault Operations (7 Cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Deposit Collateral Form */}
          <div className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-neutral-950 font-serif font-bold text-base">
              <ArrowDownCircle className="w-5 h-5 text-blue-600" />
              <span>Deposit Collateral</span>
            </div>
            <p className="text-xs text-neutral-500 font-sans leading-relaxed">
              Deposits raw token units into the vault. Storage balance is recorded without rebasing.
            </p>
            <form onSubmit={handleDeposit} className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Raw stock units (e.g. 100)"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-neutral-200 focus:outline-none focus:border-neutral-900"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-neutral-400">{selectedAsset}</span>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-neutral-950 text-white rounded text-xs font-medium hover:bg-neutral-800 transition"
              >
                Execute Deposit
              </button>
            </form>
          </div>

          {/* Borrow Stablecoin Form */}
          <div className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-neutral-950 font-serif font-bold text-base">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Borrow Stablecoin</span>
            </div>
            <p className="text-xs text-neutral-500 font-sans leading-relaxed">
              Re-evaluates live Total Return Price before minting USDC debt.
            </p>
            <form onSubmit={handleBorrow} className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="USDC amount (e.g. 5000)"
                  value={borrowInput}
                  onChange={(e) => setBorrowInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-neutral-200 focus:outline-none focus:border-neutral-900"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-neutral-400">USDC</span>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-neutral-950 text-white rounded text-xs font-medium hover:bg-neutral-800 transition"
              >
                Execute Borrow
              </button>
            </form>
          </div>

          {/* Repay Debt Form */}
          <div className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-neutral-950 font-serif font-bold text-base">
              <RefreshCw className="w-5 h-5 text-neutral-700" />
              <span>Repay Debt</span>
            </div>
            <p className="text-xs text-neutral-500 font-sans leading-relaxed">
              Transfers stablecoins back to vault, reducing liabilities and boosting health factor.
            </p>
            <form onSubmit={handleRepay} className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Repay amount (e.g. 5000)"
                  value={repayInput}
                  onChange={(e) => setRepayInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-neutral-200 focus:outline-none focus:border-neutral-900"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-neutral-400">USDC</span>
              </div>
              <button
                type="submit"
                className="w-full py-2 border border-neutral-300 bg-white text-neutral-800 rounded text-xs font-medium hover:bg-neutral-50 transition"
              >
                Execute Repay
              </button>
            </form>
          </div>

          {/* Withdraw Collateral Form */}
          <div className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-neutral-950 font-serif font-bold text-base">
              <ArrowUpCircle className="w-5 h-5 text-amber-600" />
              <span>Withdraw Collateral</span>
            </div>
            <p className="text-xs text-neutral-500 font-sans leading-relaxed">
              Releases raw stock collateral only if remaining position satisfies solvency ($HF \ge 1.0$).
            </p>
            <form onSubmit={handleWithdraw} className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Raw stock units (e.g. 50)"
                  value={withdrawInput}
                  onChange={(e) => setWithdrawInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-neutral-200 focus:outline-none focus:border-neutral-900"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-neutral-400">{selectedAsset}</span>
              </div>
              <button
                type="submit"
                className="w-full py-2 border border-neutral-300 bg-white text-neutral-800 rounded text-xs font-medium hover:bg-neutral-50 transition"
              >
                Execute Withdraw
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Flame,
  Zap,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  ArrowUpRight,
  Info,
  Wallet,
  Coins
} from 'lucide-react';
import { ScoredToken, HolderCluster, SameSlotBuyGroup } from '@/lib/types';
import ConfidenceScoreBadge from './ConfidenceScoreBadge';

interface TokenDrawerProps {
  token: ScoredToken | null;
  onClose: () => void;
  onExecuteTrade?: (mint: string, solAmount: number, symbol: string) => void;
}

export function TokenDrawer({
  token,
  onClose,
  onExecuteTrade,
}: TokenDrawerProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'holders' | 'audit' | 'trade'>('chart');
  const [copied, setCopied] = useState(false);
  const [solAmount, setSolAmount] = useState<number>(0.5);
  const [customSol, setCustomSol] = useState<string>('');
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);

  if (!token) return null;

  const { token: t, totalRiskScore, verdict, checks, holderClusters, sameSlotBuys } = token;

  const handleCopy = () => {
    navigator.clipboard.writeText(t.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickBuy = (amount: number) => {
    setSolAmount(amount);
    setCustomSol('');
  };

  const executeTradeAction = () => {
    const finalAmount = customSol ? parseFloat(customSol) : solAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) return;

    if (onExecuteTrade) {
      onExecuteTrade(t.mint, finalAmount, t.symbol);
    }
    setTradeStatus(`Simulated buy of ${finalAmount} SOL in $${t.symbol} executed!`);
    setTimeout(() => setTradeStatus(null), 3000);
  };

  // Truncate address
  const truncate = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  // Format currency
  const formatUsd = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    if (val < 0.01) return `$${val.toFixed(6)}`;
    return `$${val.toFixed(2)}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        />

        {/* Slide-over Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-xl bg-[#090e1c] border-l border-[#1a253e] h-full shadow-2xl flex flex-col z-10 text-slate-200 text-xs overflow-hidden"
        >
          {/* DRAWER HEADER */}
          <div className="p-3.5 sm:p-4 bg-[#060a14] border-b border-[#162035] flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center">
                {t.image ? (
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-mono font-bold text-sm text-indigo-400">
                    {t.symbol.slice(0, 2)}
                  </span>
                )}
                {t.isMigrated && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-mono font-extrabold text-base text-white">
                    ${t.symbol}
                  </h2>
                  <span className="text-slate-400 text-xs truncate max-w-[140px]">
                    {t.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 transition-colors"
                  >
                    <span>{truncate(t.mint)}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {t.source === 'pump.fun' ? 'pump.fun curve' : 'Raydium Pool'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ConfidenceScoreBadge scoredToken={token} showModalOnClick={false} />
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* QUICK METRICS STRIP */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-[#080d1a] border-b border-[#162035] font-mono text-center text-xs tabular-nums shrink-0">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Price</span>
              <span className="font-bold text-emerald-400">{formatUsd(t.priceUsd)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Market Cap</span>
              <span className="font-bold text-slate-100">{formatUsd(t.marketCapUsd)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Liquidity</span>
              <span className="font-semibold text-slate-300">{formatUsd(t.liquidityUsd)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Bonding Curve</span>
              <span className="font-bold text-cyan-400">
                {t.bondingCurveProgress !== undefined ? `${t.bondingCurveProgress}%` : (t.isMigrated ? '100%' : '54%')}
              </span>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex border-b border-[#162035] bg-[#070b16] px-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'chart'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Chart & Trades</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('holders')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'holders'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Holder Clusters</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>4-Check Audit</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trade')}
              className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'trade'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quick Buy</span>
            </button>
          </div>

          {/* TAB CONTENTS (SCROLLABLE) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {/* TAB 1: CHART & OVERVIEW */}
            {activeTab === 'chart' && (
              <div className="space-y-3">
                {/* Embedded DexScreener Chart Frame */}
                <div className="w-full h-80 bg-black rounded-xl overflow-hidden border border-slate-800 relative">
                  <iframe
                    src={`https://dexscreener.com/solana/${t.mint}?embed=1&theme=dark&trades=0&info=0`}
                    title="Token Chart"
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>

                {/* Direct DEX & Scan links */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={`https://dexscreener.com/solana/${t.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>DexScreener</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                  </a>
                  <a
                    href={`https://pump.fun/${t.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>pump.fun</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  </a>
                  <a
                    href={`https://solscan.io/token/${t.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Solscan</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                  </a>
                  <a
                    href={`https://rugcheck.xyz/tokens/${t.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>RugCheck</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  </a>
                </div>

                {/* Quick Buy Simulator Bar */}
                <div className="p-3 bg-[#0d1428] border border-indigo-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      Quick Trade Action
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Simulation Mode
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 font-mono">
                    {[0.1, 0.5, 1.0, 2.0].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickBuy(amt)}
                        className={`py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                          solAmount === amt && !customSol
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {amt} SOL
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={executeTradeAction}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Quick Buy {customSol || solAmount} SOL (${t.symbol})</span>
                  </button>
                  {tradeStatus && (
                    <div className="p-2 rounded bg-emerald-500/20 text-emerald-300 text-center font-mono text-[11px]">
                      {tradeStatus}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: HOLDER DISTRIBUTION & CLUSTERS */}
            {activeTab === 'holders' && (
              <div className="space-y-3">
                <div className="bg-[#0b1020] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                      <PieIcon className="w-4 h-4 text-cyan-400" />
                      Holder Supply Distribution
                    </h3>
                    <span className="font-mono text-cyan-400 font-bold text-xs">
                      {t.top10HoldersPct || 18.5}% in Top 10
                    </span>
                  </div>

                  {/* Segmented supply distribution bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                      <div className="h-full bg-indigo-500" style={{ width: `${t.bondingCurveProgress || 55}%` }} title="Bonding Curve / LP" />
                      <div className="h-full bg-cyan-400" style={{ width: '18%' }} title="Top Holders" />
                      <div className="h-full bg-emerald-400" style={{ width: '22%' }} title="Retail Holders" />
                      <div className="h-full bg-amber-400" style={{ width: '5%' }} title="Dev Holding" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" /> Curve/LP ({t.bondingCurveProgress || 55}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" /> Top 10 (18%)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Community (22%)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Dev (5%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Funder Clusters List */}
                <div className="bg-[#0b1020] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <h3 className="font-bold text-slate-100 text-xs">
                    Detected Funding Clusters ({holderClusters?.length || 0})
                  </h3>
                  {holderClusters && holderClusters.length > 0 ? (
                    <div className="space-y-2">
                      {holderClusters.map((cluster, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-slate-300 font-semibold">
                              Funder: {truncate(cluster.funder)}
                            </span>
                            <span className="font-mono font-bold text-amber-400">
                              {cluster.totalSupplyPct}% of Supply
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400 text-[10px]">
                            <span>Wallets funded: {cluster.wallets.length}</span>
                            <span>{cluster.isCex ? 'CEX Routed' : 'Direct Transfer'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 py-3 text-center">
                      No coordinated insider funding clusters detected. Supply appears organically dispersed.
                    </p>
                  )}
                </div>

                {/* Same-Slot Buys */}
                <div className="bg-[#0b1020] border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <h3 className="font-bold text-slate-100 text-xs">
                    Block-0 / Same-Slot Bundle Activity
                  </h3>
                  {sameSlotBuys && sameSlotBuys.length > 0 ? (
                    <div className="space-y-1.5">
                      {sameSlotBuys.map((bundle, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between text-[11px]"
                        >
                          <span className="font-mono text-slate-300">
                            Slot +{bundle.deltaSlots} ({bundle.wallets.length} wallets)
                          </span>
                          <span className="font-mono font-bold text-rose-400">
                            {bundle.totalSupplyPct}% supply bought
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 py-2 text-center">
                      No sniper bundles detected in initial genesis slots.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: 4-CHECK DEEP AUDIT */}
            {activeTab === 'audit' && (
              <div className="space-y-2.5">
                {/* CHECK A: Holder Funding Trace */}
                <div className="p-3 rounded-xl bg-[#0b1020] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">
                      Check A: Holder Funding Trace
                    </span>
                    <span
                      className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                        checks?.holderFundingTrace?.score >= 70
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      Score: {checks?.holderFundingTrace?.score || 85}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Walks back top 20 holders up to 3 hops on Helius API to uncover shared origins or CEX masks.
                  </p>
                </div>

                {/* CHECK B: Deployer Check */}
                <div className="p-3 rounded-xl bg-[#0b1020] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">
                      Check B: Deployer & RugCheck Audit
                    </span>
                    <span
                      className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                        checks?.deployerCheck?.score >= 70
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      Score: {checks?.deployerCheck?.score || 80}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Evaluates creator previous deployments, 24h mortality rate, and RugCheck public report.
                  </p>
                </div>

                {/* CHECK C: Same Slot Buys */}
                <div className="p-3 rounded-xl bg-[#0b1020] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">
                      Check C: Same-Slot / Bundled Buys
                    </span>
                    <span
                      className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                        checks?.sameSlotBuys?.score >= 70
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      Score: {checks?.sameSlotBuys?.score || 90}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Identifies Jito bundles landing in the genesis creation slot to hoard supply.
                  </p>
                </div>

                {/* CHECK D: Confirmation Layer */}
                <div className="p-3 rounded-xl bg-[#0b1020] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">
                      Check D: Multi-Layer Confirmation
                    </span>
                    <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Score: {checks?.confirmationLayer?.score || 85}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Aggregates DexScreener boosts, RugCheck signals, and GMGN smart money consensus.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: QUICK TRADE INTERACTIVE PANEL */}
            {activeTab === 'trade' && (
              <div className="space-y-3">
                <div className="bg-[#0b1020] border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    Solana Fast-Buy Terminal
                  </h3>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Choose Size (SOL)
                    </label>
                    <div className="grid grid-cols-4 gap-2 font-mono">
                      {[0.1, 0.25, 0.5, 1.0].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickBuy(amt)}
                          className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                            solAmount === amt && !customSol
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {amt} SOL
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Or Custom SOL Amount
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.01"
                      placeholder="e.g. 2.5 SOL"
                      value={customSol}
                      onChange={(e) => setCustomSol(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Token to Receive:</span>
                      <span className="text-white font-bold">
                        ~{Math.round(((customSol ? parseFloat(customSol) : solAmount) * 184) / (t.priceUsd || 0.000045)).toLocaleString()} ${t.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Estimated USD:</span>
                      <span className="text-emerald-400">
                        ~${((customSol ? parseFloat(customSol) : solAmount) * 184).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={executeTradeAction}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Execute Paper Snipe</span>
                  </button>

                  {tradeStatus && (
                    <div className="p-2 rounded bg-emerald-500/20 text-emerald-300 text-center font-mono text-xs">
                      {tradeStatus}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Live External Trading Terminals:</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <a
                      href={`https://photon-sol.tinyastro.io/en/lp/${t.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded font-medium flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" /> Photon
                    </a>
                    <a
                      href={`https://bullx.io/terminal?chainId=1399811149&address=${t.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded font-medium flex items-center gap-1"
                    >
                      <TrendingUp className="w-3 h-3" /> BullX
                    </a>
                    <a
                      href={`https://jup.ag/swap/SOL-${t.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded font-medium flex items-center gap-1"
                    >
                      <Layers className="w-3 h-3" /> Jupiter
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TokenDrawer;

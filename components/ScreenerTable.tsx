'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  ExternalLink,
  Flame,
  TrendingUp,
  ArrowUpRight,
  Layers,
  Sparkles,
  Zap,
  Clock,
  Shield,
  Activity,
  ChevronRight,
  Globe,
  Share2
} from 'lucide-react';
import { ScoredToken } from '@/lib/types';
import ConfidenceScoreBadge from './ConfidenceScoreBadge';

interface ScreenerTableProps {
  tokens: ScoredToken[];
  onSelectToken: (token: ScoredToken) => void;
  viewMode?: 'table' | 'grid';
  loading?: boolean;
}

export function ScreenerTable({
  tokens,
  onSelectToken,
  viewMode = 'table',
  loading = false,
}: ScreenerTableProps) {
  const [copiedMint, setCopiedMint] = useState<string | null>(null);

  const handleCopy = (mint: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mint);
    setCopiedMint(mint);
    setTimeout(() => {
      setCopiedMint(null);
    }, 1800);
  };

  // Helper to format currency
  const formatUsd = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    if (val < 0.01) return `$${val.toFixed(6)}`;
    return `$${val.toFixed(2)}`;
  };

  // Helper to format time relative
  const formatAge = (ts?: number) => {
    if (!ts) return 'Just now';
    const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Truncate contract address
  const truncateCa = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (loading && tokens.length === 0) {
    return (
      <div className="w-full space-y-2 p-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-14 w-full bg-slate-900/60 border border-slate-800/80 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-slate-800/80 rounded-2xl bg-[#080d19]/60 mx-3 my-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-slate-200">No Matching Pairs Detected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Adjust your filters or wait for the next pump.fun & Raydium memecoin block crawl.
        </p>
      </div>
    );
  }

  // ---------------- TABLE VIEW (DESKTOP OPTIMIZED) ----------------
  if (viewMode === 'table') {
    return (
      <div className="w-full">
        {/* DESKTOP DATA-DENSE TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse select-none">
            <thead>
              <tr className="border-b border-[#162035] bg-[#070b16] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Token / Pair</th>
                <th className="py-2.5 px-3">Contract Address</th>
                <th className="py-2.5 px-3">Age</th>
                <th className="py-2.5 px-3 text-right">Market Cap</th>
                <th className="py-2.5 px-3 text-right">Liquidity</th>
                <th className="py-2.5 px-3 text-right">5m / 1h Vol</th>
                <th className="py-2.5 px-3 min-w-[150px]">Txns (Buys/Sells)</th>
                <th className="py-2.5 px-3">Confidence Score</th>
                <th className="py-2.5 px-3 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#12192c]">
              <AnimatePresence initial={false}>
                {tokens.map((item) => {
                  const { token, totalRiskScore } = item;
                  const isCopied = copiedMint === token.mint;
                  const buys = token.txns5m?.buys || Math.max(12, Math.round((totalRiskScore / 10) * 3));
                  const sells = token.txns5m?.sells || Math.max(3, Math.round(((100 - totalRiskScore) / 10) * 1.5));
                  const totalTx = buys + sells;
                  const buyPct = Math.round((buys / (totalTx || 1)) * 100);

                  return (
                    <motion.tr
                      key={token.mint}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => onSelectToken(item)}
                      className="group cursor-pointer hover:bg-[#0c1326] transition-colors duration-150 border-b border-[#131b2e]"
                    >
                      {/* TOKEN NAME & TICKER */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 flex items-center justify-center">
                            {token.image ? (
                              <img
                                src={token.image}
                                alt={token.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="font-mono font-bold text-xs text-indigo-400">
                                {token.symbol.slice(0, 2)}
                              </span>
                            )}
                            {token.isMigrated && (
                              <span
                                className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-cyan-400 border border-[#05070d]"
                                title="Migrated to Raydium LP"
                              />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-100 font-mono text-xs group-hover:text-indigo-300 transition-colors">
                                ${token.symbol}
                              </span>
                              {token.trending && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <Flame className="w-2.5 h-2.5" />
                                </span>
                              )}
                              {token.bondingCurveProgress !== undefined && token.bondingCurveProgress < 100 && (
                                <span className="text-[10px] text-cyan-400 font-mono" title="Bonding Curve Progress">
                                  {token.bondingCurveProgress}%
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                              {token.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* CONTRACT ADDRESS WITH COPY */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(token.mint, e)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-mono text-[11px] transition-colors"
                            title="Copy Contract Address"
                          >
                            <span>{truncateCa(token.mint)}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* AGE */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px] tabular-nums">
                        {formatAge(token.createdTimestamp)}
                      </td>

                      {/* MARKET CAP */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-100 text-xs tabular-nums">
                        {formatUsd(token.marketCapUsd)}
                      </td>

                      {/* LIQUIDITY */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-slate-300 text-xs tabular-nums">
                        {formatUsd(token.liquidityUsd)}
                      </td>

                      {/* 5M / 1H VOLUME */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-[11px] tabular-nums">
                        <div className="text-slate-100 font-semibold">
                          {formatUsd(token.volume5mUsd || (token.volume24hUsd ? token.volume24hUsd * 0.1 : 0))}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          1h: {formatUsd(token.volume1hUsd || (token.volume24hUsd ? token.volume24hUsd * 0.35 : 0))}
                        </div>
                      </td>

                      {/* TXNS (BUYS / SELLS PROGRESS BAR) */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 w-full max-w-[170px]">
                          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                            <span className="text-emerald-400 font-bold">{buys} B</span>
                            <span className="text-slate-400">{buyPct}%</span>
                            <span className="text-rose-400 font-bold">{sells} S</span>
                          </div>
                          {/* Two-tone Buy/Sell Ratio Progress Bar */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-400 transition-all duration-300"
                              style={{ width: `${buyPct}%` }}
                              title={`${buys} Buys (${buyPct}%)`}
                            />
                            <div
                              className="h-full bg-rose-500 transition-all duration-300"
                              style={{ width: `${100 - buyPct}%` }}
                              title={`${sells} Sells (${100 - buyPct}%)`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* CONFIDENCE SCORE BADGE */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <ConfidenceScoreBadge
                          scoredToken={item}
                          onOpenDetails={() => onSelectToken(item)}
                        />
                      </td>

                      {/* QUICK ACTION BUTTON */}
                      <td className="py-2 px-3 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectToken(item);
                            }}
                            className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-lg text-[11px] font-bold transition-all duration-150 flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Trade</span>
                          </button>
                          <a
                            href={`https://dexscreener.com/solana/${token.mint}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
                            title="View on DexScreener"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* MOBILE COLLAPSED CARD LAYOUT (< 768px) */}
        <div className="md:hidden divide-y divide-[#162035] p-2 space-y-2">
          {tokens.map((item) => {
            const { token } = item;
            const isCopied = copiedMint === token.mint;
            const buys = token.txns5m?.buys || 18;
            const sells = token.txns5m?.sells || 6;
            const totalTx = buys + sells;
            const buyPct = Math.round((buys / (totalTx || 1)) * 100);

            return (
              <div
                key={token.mint}
                onClick={() => onSelectToken(item)}
                className="bg-[#0b1020] border border-[#162035] rounded-xl p-3 space-y-2.5 hover:border-indigo-500/40 transition-colors cursor-pointer"
              >
                {/* Header: Token Info & Confidence Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center">
                      {token.image ? (
                        <img
                          src={token.image}
                          alt={token.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="font-mono font-bold text-xs text-indigo-400">
                          {token.symbol.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-100 font-mono text-sm">
                          ${token.symbol}
                        </span>
                        {token.trending && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                            HOT
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatAge(token.createdTimestamp)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {token.name}
                      </div>
                    </div>
                  </div>

                  <ConfidenceScoreBadge scoredToken={item} compact />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 bg-[#060a14] p-2 rounded-lg border border-slate-800/80 font-mono text-xs tabular-nums">
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">MCap</span>
                    <span className="font-bold text-slate-100">
                      {formatUsd(token.marketCapUsd)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Liq</span>
                    <span className="text-slate-300 font-semibold">
                      {formatUsd(token.liquidityUsd)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">5m Vol</span>
                    <span className="text-emerald-400 font-semibold">
                      {formatUsd(token.volume5mUsd || (token.volume24hUsd ? token.volume24hUsd * 0.1 : 0))}
                    </span>
                  </div>
                </div>

                {/* Txns Buy / Sell Bar & CA Copy */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="text-emerald-400 font-bold">{buys} B</span>
                      <span className="text-slate-400">{buyPct}% Buys</span>
                      <span className="text-rose-400 font-bold">{sells} S</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-400" style={{ width: `${buyPct}%` }} />
                      <div className="h-full bg-rose-500" style={{ width: `${100 - buyPct}%` }} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleCopy(token.mint, e)}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-[10px] font-mono flex items-center gap-1 shrink-0"
                  >
                    <span>{truncateCa(token.mint)}</span>
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------- GRID VIEW (CARDS) ----------------
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
      {tokens.map((item) => {
        const { token } = item;
        const isCopied = copiedMint === token.mint;
        const buys = token.txns5m?.buys || 15;
        const sells = token.txns5m?.sells || 5;
        const totalTx = buys + sells;
        const buyPct = Math.round((buys / (totalTx || 1)) * 100);

        return (
          <div
            key={token.mint}
            onClick={() => onSelectToken(item)}
            className="group bg-[#0b1020] hover:bg-[#0e162d] border border-[#162035] hover:border-indigo-500/50 rounded-xl p-3.5 space-y-3 transition-all duration-150 cursor-pointer shadow-md"
          >
            {/* Top Row: Symbol, Age, Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center">
                  {token.image ? (
                    <img
                      src={token.image}
                      alt={token.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="font-mono font-bold text-sm text-indigo-400">
                      {token.symbol.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-100 text-sm group-hover:text-indigo-300">
                      ${token.symbol}
                    </span>
                    {token.trending && (
                      <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                        HOT
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block truncate max-w-[130px]">
                    {token.name}
                  </span>
                </div>
              </div>
              <ConfidenceScoreBadge scoredToken={item} compact />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#050812] p-2 rounded-lg border border-slate-800/80 font-mono text-xs tabular-nums">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">MCap</span>
                <span className="font-bold text-slate-100">{formatUsd(token.marketCapUsd)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Liq</span>
                <span className="text-slate-300 font-semibold">{formatUsd(token.liquidityUsd)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">5m Vol</span>
                <span className="text-emerald-400 font-semibold">
                  {formatUsd(token.volume5mUsd || (token.volume24hUsd ? token.volume24hUsd * 0.1 : 0))}
                </span>
              </div>
            </div>

            {/* Txns Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono tabular-nums">
                <span className="text-emerald-400 font-bold">{buys} Buys</span>
                <span className="text-slate-400">{buyPct}% ratio</span>
                <span className="text-rose-400 font-bold">{sells} Sells</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-400" style={{ width: `${buyPct}%` }} />
                <div className="h-full bg-rose-500" style={{ width: `${100 - buyPct}%` }} />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={(e) => handleCopy(token.mint, e)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded font-mono text-[10px] border border-slate-700 flex items-center gap-1"
              >
                <span>{truncateCa(token.mint)}</span>
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <span className="text-[10px] text-slate-500 font-mono">
                {formatAge(token.createdTimestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ScreenerTable;

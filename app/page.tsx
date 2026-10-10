'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { ScoredToken, RiskVerdict } from '@/lib/types';

export default function DashboardPage() {
  const [tokens, setTokens] = useState<ScoredToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [selectedToken, setSelectedToken] = useState<ScoredToken | null>(null);

  // Filters
  const [minScore, setMinScore] = useState(0);
  const [hideFailed, setHideFailed] = useState(false);
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [migratedOnly, setMigratedOnly] = useState(false);

  // Manual search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (minScore > 0) params.set('minScore', String(minScore));
      if (hideFailed) params.set('hideFailed', 'true');
      if (trendingOnly) params.set('trending', 'true');
      if (migratedOnly) params.set('migrated', 'true');

      const res = await fetch(`/api/tokens?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tokens feed');
      const data = await res.json();
      if (data.tokens) {
        setTokens(data.tokens);
      }
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshCountdown(30);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [minScore, hideFailed, trendingOnly, migratedOnly]);

  // Polling countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchTokens();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Token not found');
      }
      setSelectedToken(data.result);
    } catch (err: any) {
      setSearchError(err.message || 'Audit failed');
    } finally {
      setIsSearching(false);
    }
  };

  const getVerdictBadge = (verdict: RiskVerdict, score: number) => {
    if (verdict === 'Looks cleaner') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Looks cleaner ({score})
        </span>
      );
    }
    if (verdict === 'Caution') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Caution ({score})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        Avoid ({score})
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="bg-[#0b1120] border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-md">
              <i className="fa-solid fa-shield-virus text-xs"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  WOODY<span className="text-purple-400">BOT</span>
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono font-semibold">
                  SOLANA RADAR
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Pump.fun Token Discovery & Insider / Rug Screener
              </p>
            </div>
          </div>

          {/* SEARCH BAR */}
          <form onSubmit={handleManualSearch} className="flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Audit any mint address or ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111726] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isSearching ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
              <span>Audit</span>
            </button>
          </form>

          {/* AUTO-REFRESH STATUS */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={fetchTokens}
              disabled={loading}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
              <span className="font-mono">{refreshCountdown}s</span>
            </button>
          </div>
        </div>
      </header>

      {/* SEARCH ERROR TOAST */}
      {searchError && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 text-rose-300 text-xs px-4 py-2 text-center">
          {searchError}
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto w-full p-4 flex-1 flex flex-col gap-4">
        {/* DISCLAIMER BANNER */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-amber-300 text-xs flex items-start gap-2.5">
          <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0 text-amber-400"></i>
          <div>
            <strong className="font-bold">Automated Screening Aid Only:</strong> Not financial advice. Passing automated checks does not guarantee safety. Solana memecoins carry extreme loss and manipulation risks. No trading, wallet connection, or private keys required.
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <section className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Min Score:</span>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="bg-[#111726] border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                <option value="0">All Scores (0+)</option>
                <option value="40">Caution+ (40+)</option>
                <option value="70">Cleaner Only (70+)</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={hideFailed}
                onChange={(e) => setHideFailed(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-400"
              />
              <span>Hide Avoided</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={trendingOnly}
                onChange={(e) => setTrendingOnly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-400"
              />
              <span>Trending Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={migratedOnly}
                onChange={(e) => setMigratedOnly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-400"
              />
              <span>Raydium Migrated</span>
            </label>
          </div>

          <div className="text-slate-400 font-mono text-[11px]">
            Showing <strong>{tokens.length}</strong> audited pump.fun tokens
          </div>
        </section>

        {/* FEED GRID */}
        {loading && !tokens.length ? (
          <div className="py-20 text-center text-slate-500 font-mono flex flex-col items-center gap-3">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-cyan-400"></i>
            <span>Pulling genesis mints from pump.fun & running 4-check audit...</span>
          </div>
        ) : tokens.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-[#0b1120] border border-slate-800 rounded-lg">
            No tokens match current filters. Try relaxing the score filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tokens.map((item) => {
              const { token, totalRiskScore, verdict, checks } = item;
              return (
                <div
                  key={token.mint}
                  onClick={() => setSelectedToken(item)}
                  className="bg-[#0b1120] hover:bg-[#0f172a] border border-slate-800 hover:border-purple-500/50 rounded-lg p-3.5 flex flex-col justify-between gap-3 cursor-pointer transition-all shadow-sm"
                >
                  {/* TOP ROW */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {token.image ? (
                          <img src={token.image} alt={token.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-slate-400 text-xs">{token.symbol.slice(0, 3)}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-white text-xs truncate max-w-[140px]">{token.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono">${token.symbol}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">
                          {token.mint.slice(0, 6)}...{token.mint.slice(-6)}
                        </div>
                      </div>
                    </div>
                    {getVerdictBadge(verdict, totalRiskScore)}
                  </div>

                  {/* MINI CHECKS BAR */}
                  <div className="grid grid-cols-4 gap-1.5 py-1.5 border-y border-slate-800/80 font-mono text-[9px] text-center">
                    <div className={`p-1 rounded ${checks.holderFundingTrace.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' : checks.holderFundingTrace.status === 'warn' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      Trace: {checks.holderFundingTrace.score}
                    </div>
                    <div className={`p-1 rounded ${checks.deployerCheck.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' : checks.deployerCheck.status === 'warn' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      Dev: {checks.deployerCheck.score}
                    </div>
                    <div className={`p-1 rounded ${checks.sameSlotBuys.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' : checks.sameSlotBuys.status === 'warn' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      Slot: {checks.sameSlotBuys.score}
                    </div>
                    <div className={`p-1 rounded ${checks.confirmationLayer.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' : checks.confirmationLayer.status === 'warn' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      Multi: {checks.confirmationLayer.score}
                    </div>
                  </div>

                  {/* BOTTOM STATS & ACTIONS */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <div>
                      {token.marketCapUsd ? (
                        <span>MCap: <strong className="text-white">${Math.round(token.marketCapUsd).toLocaleString()}</strong></span>
                      ) : (
                        <span>Pump Curve</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://pump.fun/${token.mint}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-cyan-400"
                        title="View on pump.fun"
                      >
                        <i className="fa-solid fa-capsules"></i>
                      </a>
                      <a
                        href={`https://solscan.io/token/${token.mint}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-cyan-400"
                        title="View on Solscan"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* TOKEN DETAIL MODAL */}
      {selectedToken && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedToken(null)}
        >
          <div
            className="bg-[#0b1120] border border-slate-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center">
                  {selectedToken.token.image ? (
                    <img src={selectedToken.token.image} alt={selectedToken.token.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-white">{selectedToken.token.symbol.slice(0, 3)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedToken.token.name}</h2>
                    <span className="text-xs font-mono text-slate-400">${selectedToken.token.symbol}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 select-all">{selectedToken.token.mint}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedToken(null)}
                className="text-slate-400 hover:text-white px-2 py-1 text-base"
              >
                ✕
              </button>
            </div>

            {/* VERDICT SUMMARY HERO */}
            <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Overall Risk Verdict</div>
                <div className="flex items-center gap-2 mt-1">
                  {getVerdictBadge(selectedToken.verdict, selectedToken.totalRiskScore)}
                  <span className="text-xs text-slate-300">{selectedToken.verdictSummary}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://pump.fun/${selectedToken.token.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-cyan-300 border border-slate-700 flex items-center gap-1"
                >
                  <span>pump.fun</span> ↗
                </a>
                <a
                  href={`https://dexscreener.com/solana/${selectedToken.token.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700 flex items-center gap-1"
                >
                  <span>DexScreener</span> ↗
                </a>
                <a
                  href={`https://solscan.io/token/${selectedToken.token.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700 flex items-center gap-1"
                >
                  <span>Solscan</span> ↗
                </a>
              </div>
            </div>

            {/* 4 AUDIT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* CHECK A: HOLDER FUNDING TRACE */}
              <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <i className="fa-solid fa-network-wired text-purple-400"></i>
                    A. Holder Funding Trace
                  </span>
                  <span className="font-mono font-bold text-xs">{selectedToken.checks.holderFundingTrace.score}/100</span>
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  {selectedToken.checks.holderFundingTrace.evidence.map((ev, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className={ev.severity === 'fail' ? 'text-rose-400' : ev.severity === 'warn' ? 'text-amber-400' : 'text-slate-400'}>•</span>
                      <span>{ev.message}</span>
                    </div>
                  ))}
                </div>
                {/* CLUSTERS SUMMARY */}
                {selectedToken.holderClusters.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Detected Cluster Groups:</div>
                    <div className="space-y-1">
                      {selectedToken.holderClusters.map((c, idx) => (
                        <div key={idx} className="bg-slate-900/60 p-1.5 rounded flex items-center justify-between font-mono text-[10px]">
                          <span className="truncate max-w-[150px]">{c.funderLabel || `${c.funder.slice(0, 6)}...`} ({c.wallets.length} w)</span>
                          <span className="text-purple-400 font-bold">{c.totalSupplyPct}% supply</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CHECK B: DEPLOYER CHECK */}
              <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <i className="fa-solid fa-user-shield text-cyan-400"></i>
                    B. Deployer Check & Authorities
                  </span>
                  <span className="font-mono font-bold text-xs">{selectedToken.checks.deployerCheck.score}/100</span>
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  {selectedToken.checks.deployerCheck.evidence.map((ev, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className={ev.severity === 'fail' ? 'text-rose-400' : ev.severity === 'warn' ? 'text-amber-400' : 'text-slate-400'}>•</span>
                      <span>{ev.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHECK C: SAME-SLOT BUYS */}
              <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <i className="fa-solid fa-bolt text-amber-400"></i>
                    C. Same-Slot / Bundled Buys
                  </span>
                  <span className="font-mono font-bold text-xs">{selectedToken.checks.sameSlotBuys.score}/100</span>
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  {selectedToken.checks.sameSlotBuys.evidence.map((ev, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className={ev.severity === 'fail' ? 'text-rose-400' : ev.severity === 'warn' ? 'text-amber-400' : 'text-slate-400'}>•</span>
                      <span>{ev.message}</span>
                    </div>
                  ))}
                </div>
                {selectedToken.sameSlotBuys.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 font-mono text-[10px]">
                    {selectedToken.sameSlotBuys.map((g, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-400">
                        <span>Slot Δ+{g.deltaSlots} ({g.wallets.length} txs)</span>
                        <span className="text-amber-400 font-bold">{g.totalSupplyPct}% supply</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CHECK D: CONFIRMATION LAYER */}
              <div className="bg-[#111726] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <i className="fa-solid fa-layer-group text-emerald-400"></i>
                    D. Confirmation Layer
                  </span>
                  <span className="font-mono font-bold text-xs">{selectedToken.checks.confirmationLayer.score}/100</span>
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  {selectedToken.checks.confirmationLayer.evidence.map((ev, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className={ev.severity === 'fail' ? 'text-rose-400' : ev.severity === 'warn' ? 'text-amber-400' : 'text-slate-400'}>•</span>
                      <span>{ev.message}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[10px] font-mono">
                  <span className={`px-2 py-0.5 rounded ${selectedToken.confirmationSources.pumpFun ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>pump.fun: ✓</span>
                  <span className={`px-2 py-0.5 rounded ${selectedToken.confirmationSources.dexScreener ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>DexScreener: ✓</span>
                  <span className={`px-2 py-0.5 rounded ${selectedToken.confirmationSources.rugCheck ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>RugCheck: ✓</span>
                  <span className={`px-2 py-0.5 rounded ${selectedToken.confirmationSources.gmgn ? 'bg-cyan-500/20 text-cyan-300' : selectedToken.confirmationSources.gmgnBlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                    GMGN: {selectedToken.confirmationSources.gmgnBlocked ? 'Skipped' : selectedToken.confirmationSources.gmgn ? '✓' : 'Off'}
                  </span>
                </div>
              </div>
            </div>

            {/* FOOTER NOTICE */}
            <div className="text-[10px] text-slate-500 text-center font-mono border-t border-slate-800 pt-3">
              Analyzed at {new Date(selectedToken.analyzedAt).toUTCString()} · Screening aid only · Not financial advice
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

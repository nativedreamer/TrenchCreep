'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ScoredToken } from '@/lib/types';
import Link from 'next/link';

export default function TokenDetailPage() {
  const params = useParams();
  const mint = params?.mint as string;
  const [token, setToken] = useState<ScoredToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mint) return;
    const fetchToken = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/token/${mint}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load token audit');
        }
        setToken(data.token);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [mint]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a12] text-white flex flex-col items-center justify-center font-mono gap-3">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-cyan-400"></i>
        <span>Performing 4-check audit on {mint?.slice(0, 8)}...</span>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-[#070a12] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-[#0b1120] border border-rose-500/40 rounded-xl p-6 max-w-md text-center">
          <i className="fa-solid fa-triangle-exclamation text-rose-400 text-3xl mb-3"></i>
          <h1 className="text-lg font-bold text-white mb-2">Audit Error</h1>
          <p className="text-xs text-slate-400 mb-4">{error || 'Token not found'}</p>
          <Link href="/" className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { totalRiskScore, verdict, checks, holderClusters, sameSlotBuys, confirmationSources } = token;

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 p-4 sm:p-8 flex flex-col gap-6 max-w-5xl mx-auto">
      {/* TOP NAV */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1.5">
          <i className="fa-solid fa-arrow-left"></i> Back to Live Feed
        </Link>
        <span className="text-[10px] font-mono text-slate-500">
          Audited at {new Date(token.analyzedAt).toUTCString()}
        </span>
      </div>

      {/* HEADER CARD */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
            {token.token.image ? (
              <img src={token.token.image} alt={token.token.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-white text-lg">{token.token.symbol.slice(0, 3)}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white">{token.token.name}</h1>
              <span className="text-xs font-mono text-slate-400">${token.token.symbol}</span>
            </div>
            <p className="text-xs font-mono text-slate-500 select-all">{token.token.mint}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <div className="text-[10px] text-slate-400 uppercase">Risk Verdict</div>
            <div className="text-base font-bold text-white">
              {verdict === 'Looks cleaner' ? (
                <span className="text-emerald-400">Cleaner ({totalRiskScore}/100)</span>
              ) : verdict === 'Caution' ? (
                <span className="text-amber-400">Caution ({totalRiskScore}/100)</span>
              ) : (
                <span className="text-rose-400">Avoid ({totalRiskScore}/100)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EXTERNAL LINKS BAR */}
      <div className="flex flex-wrap gap-2.5 text-xs font-mono">
        <a
          href={`https://pump.fun/${token.token.mint}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-[#0b1120] border border-slate-700 hover:border-cyan-400 rounded-lg text-cyan-300 flex items-center gap-1.5"
        >
          <i className="fa-solid fa-capsules"></i> pump.fun
        </a>
        <a
          href={`https://dexscreener.com/solana/${token.token.mint}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-[#0b1120] border border-slate-700 hover:border-cyan-400 rounded-lg text-slate-300 flex items-center gap-1.5"
        >
          <i className="fa-solid fa-chart-line"></i> DexScreener
        </a>
        <a
          href={`https://solscan.io/token/${token.token.mint}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-[#0b1120] border border-slate-700 hover:border-cyan-400 rounded-lg text-slate-300 flex items-center gap-1.5"
        >
          <i className="fa-solid fa-cube"></i> Solscan
        </a>
      </div>

      {/* HOLDER CLUSTER VISUALIZATION */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-diagram-project text-purple-400"></i>
          Holder Cluster Visualization
        </h2>
        <p className="text-xs text-slate-400">
          Wallets walked back up to 3 funding hops to identify common root funders, fresh funding windows, and CEX distribution masking.
        </p>

        {holderClusters.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-mono bg-[#111726] rounded-lg">
            No suspicious holder clusters detected. Supply appears distributed.
          </div>
        ) : (
          <div className="space-y-2 mt-2 font-mono text-xs">
            {holderClusters.map((cluster, i) => (
              <div key={i} className="bg-[#111726] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                    <span className="font-bold text-white">
                      {cluster.funderLabel || `Root Funder: ${cluster.funder.slice(0, 8)}...${cluster.funder.slice(-6)}`}
                    </span>
                  </div>
                  <span className="font-bold text-purple-400">{cluster.totalSupplyPct}% of supply</span>
                </div>
                {/* CLUSTER SUPPLY BAR */}
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, cluster.totalSupplyPct * 2)}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-400">
                  {cluster.wallets.length} wallet(s) linked to this funding node
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4 CHECKS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* CHECK A */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-network-wired text-purple-400"></i>
              A. Holder Funding Trace
            </h3>
            <span className="font-mono font-bold text-xs">{checks.holderFundingTrace.score}/100</span>
          </div>
          <div className="space-y-2 text-slate-300">
            {checks.holderFundingTrace.evidence.map((ev, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={ev.severity === 'fail' ? 'text-rose-400' : ev.severity === 'warn' ? 'text-amber-400' : 'text-slate-500'}>•</span>
                <span>{ev.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHECK B */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-user-shield text-cyan-400"></i>
              B. Deployer Check
            </h3>
            <span className="font-mono font-bold text-xs">{checks.deployerCheck.score}/100</span>
          </div>
          <div className="space-y-2 text-slate-300">
            {checks.deployerCheck.evidence.map((ev, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={ev.severity === 'fail' ? 'text-rose-400' : ev.severity === 'warn' ? 'text-amber-400' : 'text-slate-500'}>•</span>
                <span>{ev.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHECK C */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-bolt text-amber-400"></i>
              C. Same-Slot / Bundled Buys
            </h3>
            <span className="font-mono font-bold text-xs">{checks.sameSlotBuys.score}/100</span>
          </div>
          <div className="space-y-2 text-slate-300">
            {checks.sameSlotBuys.evidence.map((ev, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={ev.severity === 'fail' ? 'text-rose-400' : ev.severity === 'warn' ? 'text-amber-400' : 'text-slate-500'}>•</span>
                <span>{ev.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHECK D */}
        <div className="bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-layer-group text-emerald-400"></i>
              D. Confirmation Layer
            </h3>
            <span className="font-mono font-bold text-xs">{checks.confirmationLayer.score}/100</span>
          </div>
          <div className="space-y-2 text-slate-300">
            {checks.confirmationLayer.evidence.map((ev, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={ev.severity === 'fail' ? 'text-rose-400' : ev.severity === 'warn' ? 'text-amber-400' : 'text-slate-500'}>•</span>
                <span>{ev.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DISCLAIMER FOOTER */}
      <div className="text-[11px] text-slate-500 text-center font-mono py-4 border-t border-slate-800">
        Woody Bot Screening Engine · Screening aid only · Not financial advice. Passing checks does not guarantee safety.
      </div>
    </div>
  );
}

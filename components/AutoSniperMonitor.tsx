import React from 'react';
import { ArrowUpRight, CircleDollarSign, ListChecks, OctagonAlert, Target } from 'lucide-react';
import { ControlPlanePosition, ProposedTransaction } from '@/lib/controlPlane';
import { ScoredToken } from '@/lib/types';

interface Props {
  qualified: ScoredToken[];
  positions: ControlPlanePosition[];
  proposals: ProposedTransaction[];
  dailyLossSol: number;
  maxDailyLossSol: number;
  onProposeBuy: (token: ScoredToken) => void;
  onPanic: () => void;
}

export default function AutoSniperMonitor({ qualified, positions, proposals, dailyLossSol, maxDailyLossSol, onProposeBuy, onPanic }: Props) {
  return <section className="mx-3 mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
    <div className="rounded-2xl border border-indigo-500/25 bg-[#0b1020] p-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-indigo-300" /><h2 className="text-sm font-bold text-white">Momentum-qualified tokens</h2></div><span className="rounded-full bg-indigo-500/15 px-2 py-1 text-[10px] font-bold text-indigo-300">{qualified.length} eligible</span></div>
      <p className="mt-1 text-[10px] text-slate-500">Baseline pass + momentum pass + score threshold + age/liquidity guards.</p>
      <div className="mt-3 space-y-2">{qualified.length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-[11px] text-slate-500">No token currently passes every execution filter.</div> : qualified.slice(0, 5).map((item) => <div key={item.token.mint} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5"><div className="min-w-0"><div className="truncate text-xs font-bold text-white">{item.token.name} <span className="font-mono text-cyan-300">${item.token.symbol}</span></div><div className="mt-0.5 text-[10px] text-slate-500">Score {item.totalRiskScore} · momentum {item.momentumStrategy?.status}</div></div><button type="button" onClick={() => onProposeBuy(item)} className="shrink-0 rounded-lg bg-indigo-500/15 px-2.5 py-1.5 text-[10px] font-bold text-indigo-300">Propose buy</button></div>)}</div>
    </div>
    <div className="rounded-2xl border border-slate-800 bg-[#0b1020] p-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-bold text-white">Execution monitor</h2></div><button type="button" onClick={onPanic} disabled={!positions.length} className="flex items-center gap-1 rounded-lg border border-rose-500/40 px-2 py-1.5 text-[10px] font-bold text-rose-300 disabled:opacity-40"><OctagonAlert className="h-3 w-3" />Emergency exit plan</button></div>
      <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-400"><span><CircleDollarSign className="mr-1 inline h-3 w-3 text-amber-300" />Daily loss {dailyLossSol.toFixed(3)} / {maxDailyLossSol.toFixed(3)} SOL</span><span>{positions.length} positions</span><span>{proposals.length} proposals</span></div>
      <div className="mt-3 space-y-2">{positions.length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-[11px] text-slate-500">No active positions. Proposed transactions are not submitted.</div> : positions.map((position) => { const pnl = position.entryPriceUsd ? ((position.currentPriceUsd / position.entryPriceUsd) - 1) * 100 : 0; return <div key={position.id} className="flex items-center justify-between rounded-xl border border-slate-800 p-2.5"><div><div className="text-xs font-bold text-white">${position.token.token.symbol}</div><div className="text-[10px] text-slate-500">{position.status} · {position.solInvested} SOL</div></div><div className={pnl >= 0 ? 'text-right text-emerald-300' : 'text-right text-rose-300'}><div className="font-mono text-xs">{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%</div><div className="text-[10px]">${position.currentPriceUsd.toFixed(8)} <ArrowUpRight className="inline h-3 w-3" /></div></div></div>; })}</div>
    </div>
  </section>;
}

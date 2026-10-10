import React, { useMemo } from 'react';
import { Download, History, TrendingDown, TrendingUp } from 'lucide-react';
import { PaperTradeActivity } from '@/lib/controlPlane';

interface Props {
  activities: PaperTradeActivity[];
}

function dayKey(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(timestamp));
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function PaperTradeHistory({ activities }: Props) {
  const grouped = useMemo(() => activities.reduce<Record<string, PaperTradeActivity[]>>((groups, activity) => {
    const key = dayKey(activity.timestamp);
    (groups[key] ||= []).push(activity);
    return groups;
  }, {}), [activities]);

  const downloadCsv = () => {
    const rows = [
      ['date', 'time', 'side', 'symbol', 'mint', 'SOL amount', 'price USD', 'PnL SOL', 'status'],
      ...activities
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((activity) => {
          const date = new Date(activity.timestamp);
          return [
            dayKey(activity.timestamp),
            date.toISOString(),
            activity.kind,
            activity.symbol,
            activity.mint,
            activity.solAmount.toFixed(6),
            activity.priceUsd.toFixed(12),
            activity.pnlSol.toFixed(6),
            activity.status,
          ];
        }),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trenchcreep-paper-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-3 mt-3 rounded-2xl border border-slate-800 bg-[#0b1020] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><History className="h-4 w-4 text-cyan-300" /><div><h2 className="text-sm font-bold text-white">Paper trade activity</h2><p className="text-[10px] text-slate-500">Persisted locally and grouped by trading day. Closing the app does not close open simulations.</p></div></div>
        <button type="button" onClick={downloadCsv} disabled={!activities.length} className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-3.5 w-3.5" />Download CSV</button>
      </div>
      {Object.keys(grouped).length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-slate-800 p-4 text-center text-[11px] text-slate-500">No simulated trades yet.</div> : <div className="mt-3 space-y-3">{Object.entries(grouped).map(([day, dayActivities]) => <div key={day}><div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{day} · {dayActivities.length} trades</div><div className="space-y-1.5">{dayActivities.map((activity) => { const positive = activity.pnlSol >= 0; return <div key={activity.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2 text-[10px]"><div className="flex min-w-0 items-center gap-2">{activity.kind === 'buy' ? <TrendingUp className="h-3.5 w-3.5 shrink-0 text-cyan-300" /> : <TrendingDown className="h-3.5 w-3.5 shrink-0 text-amber-300" />}<div className="min-w-0"><div className="font-bold text-white">{activity.kind.toUpperCase()} ${activity.symbol}</div><div className="truncate font-mono text-slate-500">{new Date(activity.timestamp).toLocaleTimeString()} · {activity.solAmount.toFixed(4)} SOL</div></div></div><div className={`font-mono ${activity.kind === 'buy' || positive ? 'text-emerald-300' : 'text-rose-300'}`}>{activity.kind === 'buy' ? 'FILLED' : `${positive ? '+' : ''}${activity.pnlSol.toFixed(4)} SOL`}</div></div>; })}</div></div>)}</div>}
    </section>
  );
}

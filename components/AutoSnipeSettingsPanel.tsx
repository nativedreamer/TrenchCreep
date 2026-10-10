import React, { useState } from 'react';
import { ShieldAlert, Wallet, Power, LockKeyhole } from 'lucide-react';
import { AutoSniperSettings, SessionWalletStatus, PriorityFeeStrategy } from '@/lib/controlPlane';

interface Props {
  settings: AutoSniperSettings;
  wallet: SessionWalletStatus;
  onUpdate: <K extends keyof AutoSniperSettings>(key: K, value: AutoSniperSettings[K]) => void;
  onConnect: (address: string, balanceSol?: number) => void;
  onDisconnect: () => void;
}

export default function AutoSnipeSettingsPanel({ settings, wallet, onUpdate, onConnect, onDisconnect }: Props) {
  const [address, setAddress] = useState('');
  return (
    <section className="mx-3 mt-3 rounded-2xl border border-rose-500/30 bg-[#0b1020] p-4 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-500/15 p-2 text-rose-300"><Power className="h-4 w-4" /></div>
          <div>
            <h2 className="text-sm font-bold text-white">Auto-Snipe Execution Control Plane</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-400">Proposal-only control plane. It detects qualified tokens and prepares unsigned transaction plans for an external signer; it never stores keys or submits transactions.</p>
          </div>
        </div>
        <button type="button" onClick={() => onUpdate('enabled', !settings.enabled)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${settings.enabled ? 'border-amber-400/50 bg-amber-400/15 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
          {settings.enabled ? 'ENGINE ARMED FOR PROPOSALS' : 'ENGINE OFF'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <label className="text-[10px] font-semibold text-slate-400">Max buy (SOL)<input type="number" min="0.001" step="0.001" value={settings.maxBuySol} onChange={(e) => onUpdate('maxBuySol', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" /></label>
        <label className="text-[10px] font-semibold text-slate-400">Take profit (x)<input type="number" min="1.01" step="0.05" value={settings.takeProfitMultiplier} onChange={(e) => onUpdate('takeProfitMultiplier', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" /></label>
        <label className="text-[10px] font-semibold text-slate-400">Slippage (%)<input type="number" min="0.1" max="50" step="0.5" value={settings.maxSlippagePct} onChange={(e) => onUpdate('maxSlippagePct', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" /></label>
        <label className="text-[10px] font-semibold text-slate-400">Stop loss (%)<input type="number" min="1" max="99" step="1" value={settings.stopLossPct} onChange={(e) => onUpdate('stopLossPct', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" /></label>
        <label className="text-[10px] font-semibold text-slate-400">Min score<input type="number" min="0" max="100" step="1" value={settings.minConfidenceScore} onChange={(e) => onUpdate('minConfidenceScore', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" /></label>
        <label className="text-[10px] font-semibold text-slate-400">Max positions<input type="number" min="1" max="20" step="1" value={settings.maxPositions} onChange={(e) => onUpdate('maxPositions', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" /></label>
        <label className="text-[10px] font-semibold text-slate-400">Daily loss (SOL)<input type="number" min="0" step="0.01" value={settings.maxDailyLossSol} onChange={(e) => onUpdate('maxDailyLossSol', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" /></label>
        <label className="text-[10px] font-semibold text-slate-400">Priority fee<select value={settings.priorityFee} onChange={(e) => onUpdate('priorityFee', e.target.value as PriorityFeeStrategy)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white"><option value="low">Low</option><option value="medium">Medium</option><option value="aggressive">Aggressive</option></select></label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-400"><ShieldAlert className="h-4 w-4 text-amber-300" />Momentum pass is required before a buy proposal.</div>
        <div className="flex items-center gap-2">
          <Wallet className={`h-4 w-4 ${wallet.connected ? 'text-emerald-300' : 'text-slate-500'}`} />
          {wallet.connected ? <><span className="font-mono text-[10px] text-emerald-300">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-6)} · {wallet.balanceSol.toFixed(3)} SOL</span><button type="button" onClick={onDisconnect} className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-300">Disconnect</button></> : <><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="External signer public address" className="w-56 rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono text-[10px] text-white" /><button type="button" disabled={!address.trim()} onClick={() => { onConnect(address.trim(), 0); setAddress(''); }} className="rounded-lg bg-cyan-500/15 px-2.5 py-2 text-[10px] font-bold text-cyan-300 disabled:opacity-40">Connect signer</button></>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><LockKeyhole className="h-3 w-3" />Public-address control-plane stub only. No seed phrase or private key input is accepted.</div>
    </section>
  );
}

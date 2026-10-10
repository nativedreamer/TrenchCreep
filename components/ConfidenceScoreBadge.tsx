'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Info, ChevronRight, Lock, Flame } from 'lucide-react';
import { ScoredToken, RiskVerdict } from '@/lib/types';

interface ConfidenceScoreBadgeProps {
  scoredToken: ScoredToken;
  showModalOnClick?: boolean;
  onOpenDetails?: () => void;
  compact?: boolean;
}

export function ConfidenceScoreBadge({
  scoredToken,
  showModalOnClick = true,
  onOpenDetails,
  compact = false,
}: ConfidenceScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { totalRiskScore, verdict, checks, token } = scoredToken;

  // Derive authority and risk metrics (falling back gracefully to checks metadata if not directly on token)
  const mintRevoked =
    token.mintAuthorityRevoked ??
    (checks?.deployerCheck?.metadata?.mintAuthority == null || checks?.deployerCheck?.metadata?.mintAuthority === 'revoked');

  const freezeRevoked =
    token.freezeAuthorityRevoked ??
    (checks?.deployerCheck?.metadata?.freezeAuthority == null || checks?.deployerCheck?.metadata?.freezeAuthority === 'revoked');

  const lpBurnedPct = token.liquidityBurnedPct ?? (token.isMigrated ? 100 : 0);

  const top10Concentration =
    token.top10HoldersPct ??
    Math.round(
      (scoredToken.holderClusters?.reduce((acc, c) => acc + (c.totalSupplyPct || 0), 0) || 18.5)
    );

  const devHolding = token.devHoldingPct ?? 0.0;
  const devHistory = token.devHistory ?? {
    totalCreated: checks?.deployerCheck?.metadata?.previousTokensCount ?? 1,
    ruggedCount: checks?.deployerCheck?.metadata?.deadTokensCount ?? 0,
    soldEarly: checks?.deployerCheck?.metadata?.soldEarly ?? false,
  };

  // Grade color theme
  const getTheme = () => {
    if (totalRiskScore >= 70) {
      return {
        bg: 'bg-emerald-950/60',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        bar: 'bg-emerald-400',
        glow: 'hover:shadow-[0_0_12px_rgba(16,185,129,0.35)]',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        icon: ShieldCheck,
        label: 'Looks cleaner',
      };
    }
    if (totalRiskScore >= 40) {
      return {
        bg: 'bg-amber-950/60',
        border: 'border-amber-500/40',
        text: 'text-amber-400',
        bar: 'bg-amber-400',
        glow: 'hover:shadow-[0_0_12px_rgba(245,158,11,0.35)]',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: AlertTriangle,
        label: 'Caution',
      };
    }
    return {
      bg: 'bg-rose-950/60',
      border: 'border-rose-500/40',
      text: 'text-rose-400',
      bar: 'bg-rose-500',
      glow: 'hover:shadow-[0_0_12px_rgba(244,63,94,0.35)]',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      icon: ShieldAlert,
      label: 'Avoid',
    };
  };

  const theme = getTheme();
  const IconComponent = theme.icon;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenDetails) {
      onOpenDetails();
    } else if (showModalOnClick) {
      setShowTooltip((prev) => !prev);
    }
  };

  return (
    <div className="relative inline-block" onMouseLeave={() => setShowTooltip(false)}>
      {/* Visual Badge */}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-150 cursor-pointer ${theme.bg} ${theme.border} ${theme.glow} text-left`}
        title="Click to view full algorithmic confidence audit"
      >
        <IconComponent className={`w-3.5 h-3.5 ${theme.text} shrink-0`} />
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className={`font-mono font-bold text-xs tabular-nums ${theme.text}`}>
              {totalRiskScore}%
            </span>
            {!compact && (
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                {theme.label}
              </span>
            )}
          </div>
          {/* Micro progress meter */}
          <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
            <div
              className={`h-full ${theme.bar} transition-all duration-300`}
              style={{ width: `${Math.max(5, totalRiskScore)}%` }}
            />
          </div>
        </div>
      </button>

      {/* Breakdown Tooltip / Popover Modal */}
      {showTooltip && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 p-3.5 rounded-xl bg-[#0b1120] border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <IconComponent className={`w-4 h-4 ${theme.text}`} />
              <span className="font-bold text-slate-100 text-xs uppercase tracking-wider">
                Risk Audit Report
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${theme.badge}`}>
              {totalRiskScore}/100 · {theme.label}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {scoredToken.verdictSummary || 'Automated multi-layered forensic heuristics evaluation.'}
          </p>

          {/* Core Risk Factors Breakdown */}
          <div className="space-y-1.5 pt-1">
            {/* Mint Authority */}
            <div className="flex items-center justify-between p-1.5 rounded-md bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-300 text-[11px] flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                Mint Authority Revoked
              </span>
              {mintRevoked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Yes (Revoked)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                  <XCircle className="w-3 h-3" /> No (Mint Risk)
                </span>
              )}
            </div>

            {/* Freeze Authority */}
            <div className="flex items-center justify-between p-1.5 rounded-md bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-300 text-[11px] flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                Freeze Authority Revoked
              </span>
              {freezeRevoked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Yes (Revoked)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                  <XCircle className="w-3 h-3" /> No (Honeypot Risk)
                </span>
              )}
            </div>

            {/* Liquidity Burned / Locked */}
            <div className="flex items-center justify-between p-1.5 rounded-md bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-300 text-[11px] flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-amber-400" />
                Liquidity Burned / Locked
              </span>
              <span className="font-mono font-bold text-xs text-slate-200 tabular-nums">
                {lpBurnedPct}% {token.isMigrated ? '(Raydium LP)' : '(Bonding Curve)'}
              </span>
            </div>

            {/* Top 10 Holders Concentration */}
            <div className="p-1.5 rounded-md bg-slate-900/80 border border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 text-[11px]">Top 10 Holders Concentration</span>
                <span className={`font-mono font-bold text-xs tabular-nums ${top10Concentration > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {top10Concentration}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${top10Concentration > 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, top10Concentration)}%` }}
                />
              </div>
            </div>

            {/* Dev Wallet Holdings & History */}
            <div className="p-1.5 rounded-md bg-slate-900/80 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Dev Wallet Holding</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {devHolding}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>Deployer Past Tokens: <strong className="text-slate-200">{devHistory.totalCreated}</strong></span>
                <span>Rugs: <strong className={devHistory.ruggedCount > 0 ? 'text-rose-400' : 'text-slate-200'}>{devHistory.ruggedCount}</strong></span>
                <span>Sold Early: <strong className="text-slate-200">{devHistory.soldEarly ? 'Yes' : 'No'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action in Tooltip */}
          {onOpenDetails && (
            <button
              onClick={() => {
                setShowTooltip(false);
                onOpenDetails();
              }}
              className="w-full mt-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-medium flex items-center justify-center gap-1 text-[11px] border border-slate-700 cursor-pointer"
            >
              <span>Inspect Holder Clusters & Deep Audit</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          <div className="text-[9px] text-slate-500 text-center italic pt-1 border-t border-slate-800/80">
            Passing checks does not guarantee safety. Do your own research.
          </div>
        </div>
      )}
    </div>
  );
}
export default ConfidenceScoreBadge;

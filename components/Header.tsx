'use client';

import React from 'react';
import { Shield, Zap, Wallet, Search, Sparkles } from 'lucide-react';

interface HeaderProps {
  paperBalance: number;
  onAuditClick: () => void;
  onTabSelect?: (tab: string) => void;
  activeTab?: string;
}

export function Header({
  paperBalance,
  onAuditClick,
  onTabSelect,
  activeTab = 'radar',
}: HeaderProps) {
  return (
    <header className="bg-[#070b16] border-b border-[#162035] px-4 py-2.5 flex items-center justify-between gap-8 shrink-0 z-30 select-none">
      {/* ZONE 1: BRAND TITLE WORDMARK */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-extrabold tracking-tight text-base text-white font-mono">
            TRENCH<span className="text-indigo-400">CREEP</span>
          </span>
          <span className="text-[10px] text-cyan-400 font-mono font-medium hidden sm:inline">
            RADAR
          </span>
        </div>
      </div>

      {/* ZONE 2: 4-5 CONCISE SINGLE-LINE NAV LINKS */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
        <button
          type="button"
          onClick={() => onTabSelect?.('radar')}
          className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'radar' ? 'text-indigo-400' : ''
          }`}
        >
          Live Radar
        </button>
        <button
          type="button"
          onClick={() => onTabSelect?.('trending')}
          className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'trending' ? 'text-indigo-400' : ''
          }`}
        >
          Trending
        </button>
        <button
          type="button"
          onClick={() => onTabSelect?.('graduated')}
          className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'graduated' ? 'text-indigo-400' : ''
          }`}
        >
          Graduated
        </button>
        <button
          type="button"
          onClick={() => onTabSelect?.('safe')}
          className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'safe' ? 'text-indigo-400' : ''
          }`}
        >
          Audited Safe
        </button>
      </nav>

      {/* ZONE 3: 1 PRIMARY ACTION & LIVE STATS */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Paper Balance display */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0c1224] border border-slate-800 text-xs font-mono">
          <Wallet className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[11px] hidden sm:inline">Paper:</span>
          <span className="text-emerald-400 font-bold tabular-nums">
            ${paperBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onAuditClick}
          className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Audit CA</span>
        </button>
      </div>
    </header>
  );
}

export default Header;

'use client';

import React from 'react';
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  LayoutList,
  LayoutGrid,
  ShieldCheck,
  Clock,
  TrendingUp,
  Flame,
  Volume2,
  VolumeX,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

export type FilterPill = 'all' | 'safe' | 'fresh' | 'volume' | 'bonding' | 'migrated';

interface FilterToolbarProps {
  activeFilter: FilterPill;
  onFilterChange: (filter: FilterPill) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  isSearching?: boolean;
  refreshCountdown: number;
  onManualRefresh: () => void;
  isRefreshing?: boolean;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  totalTokensCount: number;
  filteredCount: number;
}

export function FilterToolbar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching = false,
  refreshCountdown,
  onManualRefresh,
  isRefreshing = false,
  viewMode,
  onViewModeChange,
  soundEnabled,
  onToggleSound,
  totalTokensCount,
  filteredCount,
}: FilterToolbarProps) {
  const filterPills: Array<{ id: FilterPill; label: string; icon: React.ElementType }> = [
    { id: 'all', label: 'All Pairs', icon: Layers },
    { id: 'safe', label: 'Audited / Safe (>70%)', icon: ShieldCheck },
    { id: 'fresh', label: 'Fresh Pairs (<10m)', icon: Clock },
    { id: 'volume', label: 'High Vol Spike', icon: TrendingUp },
    { id: 'bonding', label: 'Bonding Curve (>50%)', icon: Sparkles },
    { id: 'migrated', label: 'Graduated / Raydium', icon: Flame },
  ];

  return (
    <div className="w-full bg-[#070b16] border-b border-[#162035] px-3 sm:px-4 py-2.5 space-y-2.5">
      {/* TOP ROW: SEARCH BAR & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Direct Contract Address (CA) or Ticker Search */}
        <form onSubmit={onSearchSubmit} className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by Contract Address (CA), ticker, or token name..."
              className="w-full bg-[#0b1020] hover:bg-[#0e1529] focus:bg-[#0f172d] border border-slate-700/80 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* RIGHT CONTROLS: STATS, VIEW TOGGLE, SOUND, AUTO-REFRESH */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          {/* Active pairs count indicator */}
          <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0b1020] border border-slate-800 rounded-lg">
            <span>Pairs:</span>
            <span className="text-slate-100 font-bold tabular-nums">
              {filteredCount}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 tabular-nums">{totalTokensCount}</span>
          </div>

          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-[#0b1020] border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Audio alerts ON (Safe gem sound)' : 'Audio alerts muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Table / Grid Mode Switcher */}
          <div className="flex items-center bg-[#0b1020] border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table View (Data Dense)"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Countdown & Manual Button */}
          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b1020] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
            title="Auto-refreshes every 30s. Click to refresh immediately."
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="tabular-nums font-semibold text-[11px] text-slate-200">
              {refreshCountdown}s
            </span>
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: FILTER PILLS TOOLBAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {filterPills.map((pill) => {
          const Icon = pill.icon;
          const isActive = activeFilter === pill.id;

          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onFilterChange(pill.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-500 font-semibold'
                  : 'bg-[#0b1020] hover:bg-[#10172e] text-slate-300 hover:text-white border border-slate-800/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FilterToolbar;

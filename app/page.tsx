'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Search,
  X,
  Zap,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { ScoredToken, RiskVerdict, PaperPosition } from '@/lib/types';
import Header from '@/components/Header';
import FilterToolbar, { FilterPill } from '@/components/FilterToolbar';
import ScreenerTable from '@/components/ScreenerTable';
import TokenDrawer from '@/components/TokenDrawer';
import ConfidenceScoreBadge from '@/components/ConfidenceScoreBadge';
import AutoSnipeSettingsPanel from '@/components/AutoSnipeSettingsPanel';
import AutoSniperMonitor from '@/components/AutoSniperMonitor';
import PaperTradeHistory from '@/components/PaperTradeHistory';
import { useAutoSniper } from '@/hooks/useAutoSniper';

// Initial fallback seeds so user experiences 0ms latency immediately
const SEED_TOKENS: ScoredToken[] = [
  {
    token: {
      mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      name: 'Woody AI Agent',
      symbol: 'WOODY',
      description: 'First autonomous security scout for Solana trench trading.',
      image: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png',
      deployer: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
      createdTimestamp: Date.now() - 140_000,
      initialSupply: 1_000_000_000,
      marketCapUsd: 84_500,
      priceUsd: 0.0000845,
      liquidityUsd: 32_100,
      volume24hUsd: 142_000,
      volume5mUsd: 18_400,
      volume1hUsd: 64_800,
      txns5m: { buys: 142, sells: 38 },
      txns1h: { buys: 520, sells: 140 },
      bondingCurveProgress: 100,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      liquidityBurnedPct: 100,
      top10HoldersPct: 14.2,
      devHoldingPct: 0.0,
      isMigrated: true,
      source: 'dexscreener',
      trending: true,
    },
    totalRiskScore: 88,
    verdict: 'Looks cleaner',
    verdictSummary: 'Low insider concentration, revoked authorities, Raydium LP locked.',
    checks: {
      holderFundingTrace: {
        id: 'holder_trace',
        name: 'Holder Funding Trace',
        status: 'pass',
        score: 92,
        evidence: [],
        metadata: { topHoldersTraced: 20, independentFundingPct: 88 },
        executionTimeMs: 120,
      },
      deployerCheck: {
        id: 'deployer_check',
        name: 'Deployer Check',
        status: 'pass',
        score: 85,
        evidence: [],
        metadata: { previousTokensCount: 2, deadTokensCount: 0, soldEarly: false },
        executionTimeMs: 150,
      },
      sameSlotBuys: {
        id: 'same_slot',
        name: 'Same-Slot Buys',
        status: 'pass',
        score: 90,
        evidence: [],
        metadata: { sameSlotWalletsCount: 0, delta1WalletsCount: 1 },
        executionTimeMs: 95,
      },
      confirmationLayer: {
        id: 'confirmation_layer',
        name: 'Confirmation Layer',
        status: 'pass',
        score: 85,
        evidence: [],
        metadata: { rugcheckScore: 120, dexScreenerBoosts: 5, gmgnTrending: true },
        executionTimeMs: 200,
      },
    },
    holderClusters: [],
    sameSlotBuys: [],
    confirmationSources: { pumpFun: true, dexScreener: true, rugCheck: true, gmgn: true },
    analyzedAt: new Date().toISOString(),
  },
  {
    token: {
      mint: 'ED59R8nFkm4nJc4R7c4aM3u9zC1d5c2Jk2n7j2p1pump',
      name: 'Cyber Pepe',
      symbol: 'CPEPE',
      description: 'Cybernetic frog engineered for supersonic velocity on Solana.',
      image: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f438.png',
      deployer: '2zNuV8zZgV9w1bUz8n7C8x6Z8p1vX5s2w9k0j7h3m5n',
      createdTimestamp: Date.now() - 420_000,
      initialSupply: 1_000_000_000,
      marketCapUsd: 48_200,
      priceUsd: 0.0000482,
      liquidityUsd: 22_400,
      volume24hUsd: 89_000,
      volume5mUsd: 11_200,
      volume1hUsd: 42_500,
      txns5m: { buys: 88, sells: 44 },
      txns1h: { buys: 310, sells: 160 },
      bondingCurveProgress: 72,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      liquidityBurnedPct: 0,
      top10HoldersPct: 18.0,
      devHoldingPct: 1.2,
      isMigrated: false,
      source: 'pump.fun',
      trending: true,
    },
    totalRiskScore: 78,
    verdict: 'Looks cleaner',
    verdictSummary: 'Organic bonding curve momentum with low dev retention.',
    checks: {
      holderFundingTrace: {
        id: 'holder_trace',
        name: 'Holder Funding Trace',
        status: 'pass',
        score: 80,
        evidence: [],
        metadata: { topHoldersTraced: 20 },
        executionTimeMs: 140,
      },
      deployerCheck: {
        id: 'deployer_check',
        name: 'Deployer Check',
        status: 'pass',
        score: 75,
        evidence: [],
        metadata: { previousTokensCount: 1, deadTokensCount: 0, soldEarly: false },
        executionTimeMs: 130,
      },
      sameSlotBuys: {
        id: 'same_slot',
        name: 'Same-Slot Buys',
        status: 'pass',
        score: 82,
        evidence: [],
        metadata: { sameSlotWalletsCount: 1 },
        executionTimeMs: 110,
      },
      confirmationLayer: {
        id: 'confirmation_layer',
        name: 'Confirmation Layer',
        status: 'pass',
        score: 75,
        evidence: [],
        metadata: { rugcheckScore: 240 },
        executionTimeMs: 180,
      },
    },
    holderClusters: [],
    sameSlotBuys: [],
    confirmationSources: { pumpFun: true, dexScreener: false, rugCheck: true, gmgn: false },
    analyzedAt: new Date().toISOString(),
  },
  {
    token: {
      mint: '4k3Dyjzvzp8eMZWUXbBC9Dlk7386VDpd859gnNpump',
      name: 'Solana Trench Doge',
      symbol: 'SDOGE',
      description: 'Doge exploring the deep trenches of high-frequency liquidity pools.',
      image: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f436.png',
      deployer: '4hM9pW2vBn7K8zCxY1dL3jK7zP4n9m2v1b0x8z4y6w2',
      createdTimestamp: Date.now() - 950_000,
      initialSupply: 1_000_000_000,
      marketCapUsd: 19_800,
      priceUsd: 0.0000198,
      liquidityUsd: 12_600,
      volume24hUsd: 34_500,
      volume5mUsd: 4_200,
      volume1hUsd: 16_800,
      txns5m: { buys: 32, sells: 24 },
      txns1h: { buys: 120, sells: 84 },
      bondingCurveProgress: 41,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      liquidityBurnedPct: 0,
      top10HoldersPct: 29.5,
      devHoldingPct: 4.8,
      isMigrated: false,
      source: 'pump.fun',
      trending: false,
    },
    totalRiskScore: 56,
    verdict: 'Caution',
    verdictSummary: 'Moderate supply cluster detected among early buyers.',
    checks: {
      holderFundingTrace: {
        id: 'holder_trace',
        name: 'Holder Funding Trace',
        status: 'warn',
        score: 55,
        evidence: [],
        metadata: { clustersCount: 2 },
        executionTimeMs: 160,
      },
      deployerCheck: {
        id: 'deployer_check',
        name: 'Deployer Check',
        status: 'pass',
        score: 65,
        evidence: [],
        metadata: { previousTokensCount: 3, deadTokensCount: 1 },
        executionTimeMs: 140,
      },
      sameSlotBuys: {
        id: 'same_slot',
        name: 'Same-Slot Buys',
        status: 'warn',
        score: 50,
        evidence: [],
        metadata: { sameSlotWalletsCount: 3 },
        executionTimeMs: 120,
      },
      confirmationLayer: {
        id: 'confirmation_layer',
        name: 'Confirmation Layer',
        status: 'warn',
        score: 55,
        evidence: [],
        metadata: { rugcheckScore: 420 },
        executionTimeMs: 190,
      },
    },
    holderClusters: [
      {
        funder: '4hM9pW2vBn7K8zCxY1dL3jK7zP4n9m2v1b0x8z4y6w2',
        isDeployer: true,
        isCex: false,
        wallets: ['7x...1', '8y...2'],
        totalSupplyPct: 14.5,
      },
    ],
    sameSlotBuys: [],
    confirmationSources: { pumpFun: true, dexScreener: false, rugCheck: true, gmgn: false },
    analyzedAt: new Date().toISOString(),
  },
];

const FEED_REFRESH_SECONDS = 5;

export default function DashboardPage() {
  const [tokens, setTokens] = useState<ScoredToken[]>(SEED_TOKENS);
  const [selectedToken, setSelectedToken] = useState<ScoredToken | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(FEED_REFRESH_SECONDS);
  const [activeFilter, setActiveFilter] = useState<FilterPill>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [paperBalance, setPaperBalance] = useState<number>(10_000);
  const [paperPositions, setPaperPositions] = useState<PaperPosition[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditInputCa, setAuditInputCa] = useState<string>('');
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const autoSniper = useAutoSniper(tokens);

  const prevBestScoreRef = useRef<number>(88);

  // Play synthesized web audio chime for clean safe gem alerts
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Audio autoplay permission silenced
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch token feed from API
  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tokens');
      if (res.ok) {
        const data = await res.json();
        // Vercel's `api/tokens.ts` is the deployed backend. Accept its
        // canonical `tokens` field and the legacy `data` alias so the UI
        // cannot silently remain on demo seed data after a backend response.
        const liveTokens: ScoredToken[] = Array.isArray(data.tokens)
          ? data.tokens
          : Array.isArray(data.data)
            ? data.data
            : [];
        if (liveTokens.length > 0) {
          setTokens(liveTokens);
          // Check if newly discovered token has high safe score
          const topScore = Math.max(...liveTokens.map((t) => t.totalRiskScore));
          if (topScore >= 80 && topScore > prevBestScoreRef.current) {
            playAlertChime();
            showToast('Safe memecoin gem discovered!');
          }
          prevBestScoreRef.current = topScore;
        }
      }
    } catch (err) {
      console.warn('[Dashboard] Feed fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshCountdown(FEED_REFRESH_SECONDS);
    }
  };

  // Countdown timer for five-second auto-polling
  useEffect(() => {
    fetchFeed();

    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchFeed();
          return FEED_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Quick manual CA search handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Check if matching token is already in feed
    const match = tokens.find(
      (t) =>
        t.token.mint.toLowerCase() === query.toLowerCase() ||
        t.token.symbol.toLowerCase() === query.toLowerCase()
    );

    if (match) {
      setSelectedToken(match);
      return;
    }

    // Otherwise invoke deep search API
    try {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.result) {
        setTokens((prev) => [data.result, ...prev.filter((p) => p.token.mint !== data.result.token.mint)]);
        setSelectedToken(data.result);
        showToast(`Audited $${data.result.token.symbol} (${data.result.totalRiskScore}%)`);
      } else {
        showToast(data.error || 'Token not found or unsupported.');
      }
    } catch (err: any) {
      showToast('Search query error.');
    } finally {
      setLoading(false);
    }
  };

  // Direct manual CA audit modal handler
  const handleModalAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ca = auditInputCa.trim();
    if (!ca) return;

    try {
      setAuditLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(ca)}`);
      const data = await res.json();
      if (res.ok && data.result) {
        setTokens((prev) => [data.result, ...prev.filter((p) => p.token.mint !== data.result.token.mint)]);
        setSelectedToken(data.result);
        setIsAuditModalOpen(false);
        setAuditInputCa('');
        showToast(`Audited $${data.result.token.symbol} (${data.result.totalRiskScore}%)`);
      } else {
        showToast(data.error || 'Audit failed. Check contract address.');
      }
    } catch {
      showToast('Audit network error.');
    } finally {
      setAuditLoading(false);
    }
  };

  // Paper Trade execution handler
  const handleExecutePaperTrade = (mint: string, solAmount: number, symbol: string) => {
    const costUsd = solAmount * 184.0;
    if (paperBalance < costUsd) {
      showToast('Insufficient paper balance.');
      return;
    }

    setPaperBalance((prev) => Math.max(0, prev - costUsd));

    const newPosition: PaperPosition = {
      id: `${mint}-${Date.now()}`,
      mint,
      symbol,
      name: symbol,
      entryPriceUsd: 184.0,
      amountTokens: Math.round((costUsd / 0.00005)),
      solInvested: solAmount,
      entryTimestamp: Date.now(),
    };

    setPaperPositions((prev) => [newPosition, ...prev]);
    showToast(`Bought ${solAmount} SOL in $${symbol}!`);
  };

  // Apply filters
  const filteredTokens = tokens.filter((item) => {
    const { token, totalRiskScore } = item;

    // Filter by search query if present
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSymbol = token.symbol.toLowerCase().includes(q);
      const matchName = token.name.toLowerCase().includes(q);
      const matchMint = token.mint.toLowerCase().includes(q);
      if (!matchSymbol && !matchName && !matchMint) return false;
    }

    // Filter by pills
    if (activeFilter === 'safe') {
      return totalRiskScore >= 70;
    }
    if (activeFilter === 'fresh') {
      const ageMs = Date.now() - token.createdTimestamp;
      return ageMs < 10 * 60 * 1000; // < 10 minutes
    }
    if (activeFilter === 'volume') {
      const vol = token.volume1hUsd || (token.volume24hUsd ? token.volume24hUsd * 0.35 : 0);
      return vol >= 25_000;
    }
    if (activeFilter === 'bonding') {
      return (token.bondingCurveProgress || 0) >= 50 && !token.isMigrated;
    }
    if (activeFilter === 'migrated') {
      return token.isMigrated;
    }

    return true;
  });

  const handleProposeBuy = (item: ScoredToken) => {
    autoSniper.proposeBuy(item);
    showToast(`Unsigned buy proposal prepared for $${item.token.symbol}.`);
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#0e162d] border border-indigo-500/40 text-slate-100 px-3.5 py-2 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR CONTRACT COMPONENT */}
      <Header
        paperBalance={paperBalance}
        onAuditClick={() => setIsAuditModalOpen(true)}
        onTabSelect={(tab) => {
          if (tab === 'safe') setActiveFilter('safe');
          else if (tab === 'graduated') setActiveFilter('migrated');
          else if (tab === 'trending') setActiveFilter('volume');
          else setActiveFilter('all');
        }}
        activeTab={activeFilter}
      />

      {/* ADVANCED FILTERING & QUICK TOGGLES TOOLBAR */}
      <FilterToolbar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        isSearching={loading}
        refreshCountdown={refreshCountdown}
        onManualRefresh={fetchFeed}
        isRefreshing={loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        totalTokensCount={tokens.length}
        filteredCount={filteredTokens.length}
      />

      <AutoSnipeSettingsPanel
        settings={autoSniper.settings}
        wallet={autoSniper.sessionWallet}
        onUpdate={autoSniper.updateSettings}
        onConnect={autoSniper.connectExternalSigner}
        onDisconnect={autoSniper.disconnectExternalSigner}
      />
      <AutoSniperMonitor
        qualified={autoSniper.momentumQualified}
        positions={autoSniper.positions}
        proposals={autoSniper.proposals}
        dailyLossSol={autoSniper.dailyLossSol}
        maxDailyLossSol={autoSniper.settings.maxDailyLossSol}
        paperBalanceSol={autoSniper.paperBalanceSol}
        paperTradingEnabled={autoSniper.settings.paperTradingEnabled}
        onProposeBuy={handleProposeBuy}
        onPanic={() => {
          autoSniper.panicSellAll();
          showToast('Engine disabled; emergency exit proposals prepared locally.');
        }}
      />
      <PaperTradeHistory activities={autoSniper.paperActivities} />

      {/* MAIN SCREENER WORKSPACE */}
      <main className="flex-1 flex flex-col w-full max-w-full overflow-hidden">
        <ScreenerTable
          tokens={filteredTokens}
          onSelectToken={(token) => setSelectedToken(token)}
          viewMode={viewMode}
          loading={loading && tokens.length === 0}
        />
      </main>

      {/* SLIDE-OVER INTERACTIVE DRAWER */}
      {selectedToken && (
        <TokenDrawer
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          onExecuteTrade={handleExecutePaperTrade}
        />
      )}

      {/* MANUAL CA AUDIT MODAL */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090e1c] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                  <Search className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Instant Contract Address Audit</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Paste any Solana token mint address or pump.fun link. The algorithmic engine audits holder clusters, genesis same-slot buys, deployer rug record, and confirmation feeds.
            </p>

            <form onSubmit={handleModalAudit} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Mint Address (CA)
                </label>
                <input
                  type="text"
                  value={auditInputCa}
                  onChange={(e) => setAuditInputCa(e.target.value)}
                  placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={auditLoading || !auditInputCa.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                {auditLoading ? (
                  <span>Auditing On-Chain Clusters...</span>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Run Deep Forensic Audit</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VISIBLE DISCLAIMER FOOTER */}
      <footer className="bg-[#04060b] border-t border-[#121929] px-4 py-2.5 text-center text-[10px] text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>TRENCHCREEP SOLANA RISK INTELLIGENCE ENGINE</span>
        </div>
        <div className="text-slate-400">
          Not financial advice. Passing checks does not mean safe. Memecoins carry extreme financial and technical risk.
        </div>
      </footer>
    </div>
  );
}

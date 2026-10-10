/**
 * Core type definitions for Woody Bot - Solana Memecoin Risk Screener
 */

export type RiskVerdict = 'Avoid' | 'Caution' | 'Looks cleaner';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface EvidenceItem {
  id: string;
  rule: string;
  severity: 'info' | 'warn' | 'fail';
  message: string;
  details?: Record<string, any>;
}

export interface CheckResult {
  id: 'holder_trace' | 'deployer_check' | 'same_slot' | 'confirmation_layer';
  name: string;
  status: CheckStatus;
  score: number; // 0 - 100 (100 = cleanest, 0 = critical risk)
  evidence: EvidenceItem[];
  metadata: Record<string, any>;
  executionTimeMs: number;
}

export interface HolderCluster {
  funder: string;
  funderLabel?: string;
  isDeployer: boolean;
  isCex: boolean;
  wallets: string[];
  totalSupplyPct: number;
  fundingWindowMinutes?: number;
}

export interface SameSlotBuyGroup {
  slot: number;
  deltaSlots: number; // 0 = same slot, 1 = +1 slot, 2 = +2 slots
  wallets: string[];
  totalSupplyPct: number;
  sharedFunders: string[];
}

export interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  deployer: string;
  createdTimestamp: number;
  createdSlot?: number;
  migratedTimestamp?: number;
  migratedSlot?: number;
  initialSupply: number;
  raydiumPool?: string;
  bondingCurve?: string;
  marketCapUsd?: number;
  priceUsd?: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  isMigrated: boolean;
  source: 'pump.fun' | 'dexscreener';
  trending: boolean;
  dexScreenerBoosts?: number;
  replyCount?: number;
  telegram?: string;
  twitter?: string;
  website?: string;
}

export interface ScoredToken {
  token: TokenInfo;
  totalRiskScore: number; // 0 - 100 (higher = cleaner/lower risk)
  verdict: RiskVerdict;
  verdictSummary: string;
  checks: {
    holderFundingTrace: CheckResult;
    deployerCheck: CheckResult;
    sameSlotBuys: CheckResult;
    confirmationLayer: CheckResult;
  };
  holderClusters: HolderCluster[];
  sameSlotBuys: SameSlotBuyGroup[];
  confirmationSources: {
    pumpFun: boolean;
    dexScreener: boolean;
    rugCheck: boolean;
    gmgn: boolean;
    gmgnBlocked?: boolean;
  };
  analyzedAt: string;
}

export interface TokenFeedFilters {
  minScore?: number;
  hideFailedChecks?: boolean;
  trendingOnly?: boolean;
  migratedOnly?: boolean;
  searchQuery?: string;
  limit?: number;
}

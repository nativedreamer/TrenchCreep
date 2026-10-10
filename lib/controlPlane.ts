import { ScoredToken } from './types';

export type PriorityFeeStrategy = 'low' | 'medium' | 'aggressive';

export interface AutoSniperSettings {
  enabled: boolean;
  maxBuySol: number;
  takeProfitMultiplier: number;
  secondTakeProfitMultiplier: number;
  maxSlippagePct: number;
  stopLossPct: number;
  minConfidenceScore: number;
  priorityFee: PriorityFeeStrategy;
  maxPositions: number;
  maxDailyLossSol: number;
  maxAgeMinutes: number;
  requireMomentumPass: boolean;
}

export interface SessionWalletStatus {
  mode: 'privy-embedded' | 'external-signer';
  connected: boolean;
  address: string | null;
  balanceSol: number;
  note: string;
}

export interface ProposedTransaction {
  id: string;
  kind: 'buy' | 'sell' | 'emergency-exit';
  mint: string;
  symbol: string;
  solAmount: number;
  createdAt: number;
  status: 'proposed_unsubmitted' | 'cancelled';
  reason: string;
}

export interface ControlPlanePosition {
  id: string;
  token: ScoredToken;
  entryPriceUsd: number;
  currentPriceUsd: number;
  solInvested: number;
  openedAt: number;
  status: 'open' | 'proposed_exit' | 'closed';
}

export interface AutoSniperSnapshot {
  settings: AutoSniperSettings;
  sessionWallet: SessionWalletStatus;
  positions: ControlPlanePosition[];
  proposals: ProposedTransaction[];
  momentumQualified: ScoredToken[];
  dailyLossSol: number;
}

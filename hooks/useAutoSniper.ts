import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScoredToken } from '@/lib/types';
import {
  AutoSniperSettings,
  AutoSniperSnapshot,
  ControlPlanePosition,
  PriorityFeeStrategy,
  ProposedTransaction,
  SessionWalletStatus,
} from '@/lib/controlPlane';

const DEFAULT_SETTINGS: AutoSniperSettings = {
  enabled: false,
  paperTradingEnabled: false,
  maxBuySol: 0.05,
  takeProfitMultiplier: 1.5,
  secondTakeProfitMultiplier: 2,
  maxSlippagePct: 15,
  stopLossPct: 20,
  minConfidenceScore: 85,
  priorityFee: 'medium',
  maxPositions: 3,
  maxDailyLossSol: 0.23,
  maxAgeMinutes: 10,
  requireMomentumPass: false,
};

const SETTINGS_STORAGE_KEY = 'trenchcreep:auto-sniper-settings:v1';

const EMPTY_WALLET: SessionWalletStatus = {
  mode: 'privy-embedded',
  connected: false,
  address: null,
  balanceSol: 0,
  note: 'Connect an external signer to review proposals. No private keys are stored here.',
};

export function useAutoSniper(tokens: ScoredToken[]) {
  const [settings, setSettings] = useState<AutoSniperSettings>(DEFAULT_SETTINGS);
  const [sessionWallet, setSessionWallet] = useState<SessionWalletStatus>(EMPTY_WALLET);
  const [positions, setPositions] = useState<ControlPlanePosition[]>([]);
  const [proposals, setProposals] = useState<ProposedTransaction[]>([]);
  const [dailyLossSol, setDailyLossSol] = useState(0);
  const [paperBalanceSol, setPaperBalanceSol] = useState(1);
  const [paperStartedAt, setPaperStartedAt] = useState<number | null>(null);

  // Remember user controls locally, but never allow a stale saved value to
  // re-enable the removed Momentum-pass gate.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<AutoSniperSettings>;
      setSettings((current) => ({ ...current, ...parsed, requireMomentumPass: false }));
    } catch {
      // Ignore unavailable or malformed browser storage.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...settings, requireMomentumPass: false }));
    } catch {
      // Ignore private-mode or unavailable browser storage.
    }
  }, [settings]);

  const momentumQualified = useMemo(() => tokens.filter((item) => {
    const { token, totalRiskScore, checks, momentumStrategy } = item;
    const ageMinutes = Math.max(0, (Date.now() - token.createdTimestamp) / 60_000);
    const baselinePassed = Object.values(checks).every((check) => check.status === 'pass');
    const momentumPassed = !settings.requireMomentumPass || (
      momentumStrategy?.status === 'pass' && momentumStrategy.triggered === false
    );
    const liquidityRatio = token.marketCapUsd && token.liquidityUsd
      ? token.liquidityUsd / token.marketCapUsd
      : 0;
    return totalRiskScore >= settings.minConfidenceScore
      && baselinePassed
      && momentumPassed
      && ageMinutes <= settings.maxAgeMinutes
      && token.mintAuthorityRevoked !== false
      && token.freezeAuthorityRevoked !== false
      && (!token.liquidityUsd || (liquidityRatio >= 0.15 && liquidityRatio <= 0.40));
  }), [tokens, settings.minConfidenceScore, settings.maxAgeMinutes, settings.requireMomentumPass]);

  const updateSettings = useCallback(<K extends keyof AutoSniperSettings>(key: K, value: AutoSniperSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const connectExternalSigner = useCallback((address: string, balanceSol = 0) => {
    setSessionWallet({
      mode: 'privy-embedded',
      connected: true,
      address,
      balanceSol,
      note: 'External signer connected. Proposed transactions remain unsubmitted until independently approved.',
    });
  }, []);

  const disconnectExternalSigner = useCallback(() => setSessionWallet(EMPTY_WALLET), []);

  const proposeBuy = useCallback((token: ScoredToken) => {
    const proposal: ProposedTransaction = {
      id: `buy-${token.token.mint}-${Date.now()}`,
      kind: 'buy',
      mint: token.token.mint,
      symbol: token.token.symbol,
      solAmount: settings.maxBuySol,
      createdAt: Date.now(),
      status: 'proposed_unsubmitted',
      reason: `Qualified: score ${token.totalRiskScore}, baseline pass, momentum pass, max slippage ${settings.maxSlippagePct}%.`,
    };
    setProposals((current) => [proposal, ...current].slice(0, 25));
    if (settings.paperTradingEnabled) {
      const entryPriceUsd = token.token.priceUsd || 0;
      setPositions((current) => {
        if (current.some((position) => position.token.token.mint === token.token.mint && position.status !== 'closed')) return current;
        if (paperBalanceSol < settings.maxBuySol || current.filter((position) => position.status !== 'closed').length >= settings.maxPositions) return current;
        if (!paperStartedAt) setPaperStartedAt(Date.now());
        setPaperBalanceSol((balance) => Math.max(0, balance - settings.maxBuySol));
        return [{
          id: `paper-${token.token.mint}-${Date.now()}`,
          token,
          entryPriceUsd,
          currentPriceUsd: entryPriceUsd,
          solInvested: settings.maxBuySol,
          openedAt: Date.now(),
          status: 'open',
        }, ...current];
      });
    }
    return proposal;
  }, [paperBalanceSol, paperStartedAt, settings.maxBuySol, settings.maxPositions, settings.maxSlippagePct, settings.paperTradingEnabled]);

  const proposeExit = useCallback((position: ControlPlanePosition, reason: string) => {
    const proposal: ProposedTransaction = {
      id: `sell-${position.id}-${Date.now()}`,
      kind: 'sell',
      mint: position.token.token.mint,
      symbol: position.token.token.symbol,
      solAmount: position.solInvested,
      createdAt: Date.now(),
      status: 'proposed_unsubmitted',
      reason,
    };
    setProposals((current) => [proposal, ...current].slice(0, 25));
    if (settings.paperTradingEnabled) {
      const multiple = position.entryPriceUsd > 0 ? position.currentPriceUsd / position.entryPriceUsd : 1;
      const pnlSol = position.solInvested * (multiple - 1);
      setPaperBalanceSol((balance) => balance + position.solInvested + pnlSol);
      if (pnlSol < 0) setDailyLossSol((loss) => loss + Math.abs(pnlSol));
      setPositions((current) => current.map((item) => item.id === position.id ? { ...item, status: 'closed' } : item));
    } else {
      setPositions((current) => current.map((item) => item.id === position.id ? { ...item, status: 'proposed_exit' } : item));
    }
    return proposal;
  }, [settings.paperTradingEnabled]);

  const panicSellAll = useCallback(() => {
    setSettings((current) => ({ ...current, enabled: false }));
    positions.filter((position) => position.status === 'open').forEach((position) => {
      proposeExit(position, 'Emergency exit requested; engine disabled.');
    });
  }, [positions, proposeExit]);

  // Control-plane event loop: paper mode can auto-fill locally without a
  // wallet session; non-paper proposals still require a public wallet session.
  useEffect(() => {
    if (!settings.enabled || (!settings.paperTradingEnabled && !sessionWallet.connected)) return;
    const openMints = new Set(positions.filter((position) => position.status !== 'closed').map((position) => position.token.token.mint));
    const existingProposals = new Set(proposals.filter((proposal) => proposal.status === 'proposed_unsubmitted').map((proposal) => proposal.mint));
    const capacity = settings.maxPositions - openMints.size - existingProposals.size;
    if (capacity <= 0) return;
    momentumQualified.slice(0, capacity).forEach((token) => {
      if (!openMints.has(token.token.mint) && !existingProposals.has(token.token.mint)) proposeBuy(token);
    });
  }, [momentumQualified, settings.enabled, settings.maxPositions, sessionWallet.connected, positions, proposals, proposeBuy]);

  // Mark paper positions against the newest read-only screener prices.
  useEffect(() => {
    if (!settings.paperTradingEnabled) return;
    const prices = new Map(tokens.map((token) => [token.token.mint, token.token.priceUsd]));
    setPositions((current) => current.map((position) => {
      const price = prices.get(position.token.token.mint);
      return price && price > 0 ? { ...position, currentPriceUsd: price } : position;
    }));
  }, [settings.paperTradingEnabled, tokens]);

  // Read-only price monitor for local UI state. It calculates trigger proposals but does not submit swaps.
  useEffect(() => {
    if (!positions.some((position) => position.status === 'open')) return;
    const interval = setInterval(() => {
      setPositions((current) => current.map((position) => {
        if (position.status !== 'open') return position;
        const currentPriceUsd = position.token.token.priceUsd || position.currentPriceUsd;
        const multiple = currentPriceUsd / position.entryPriceUsd;
        if (multiple >= settings.secondTakeProfitMultiplier) {
          proposeExit(position, `Take-profit target 2.0x reached at ${multiple.toFixed(2)}x.`);
        } else if (multiple >= settings.takeProfitMultiplier) {
          proposeExit(position, `Take-profit target 1.5x reached at ${multiple.toFixed(2)}x.`);
        } else if (multiple <= 1 - (settings.stopLossPct / 100)) {
          proposeExit(position, `Stop-loss threshold reached at ${(multiple * 100 - 100).toFixed(1)}%.`);
        }
        return { ...position, currentPriceUsd };
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [positions, settings.takeProfitMultiplier, settings.secondTakeProfitMultiplier, settings.stopLossPct, proposeExit]);

  const snapshot: AutoSniperSnapshot = { settings, sessionWallet, positions, proposals, momentumQualified, dailyLossSol, paperBalanceSol, paperStartedAt };
  return {
    ...snapshot,
    updateSettings,
    connectExternalSigner,
    disconnectExternalSigner,
    proposeBuy,
    proposeExit,
    panicSellAll,
    setDailyLossSol,
    setPaperTradingEnabled: (enabled: boolean) => {
      setSettings((current) => ({ ...current, paperTradingEnabled: enabled }));
      if (enabled && !paperStartedAt) setPaperStartedAt(Date.now());
    },
    resetPaperAccount: () => {
      setPaperBalanceSol(1);
      setDailyLossSol(0);
      setPaperStartedAt(Date.now());
      setPositions([]);
      setProposals([]);
    },
  };
}

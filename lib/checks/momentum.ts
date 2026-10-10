import { kv } from '../kv.js';
import { MomentumCheck, MomentumStrategyResult, TokenInfo } from '../types.js';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const WASH_TX_THRESHOLD = 50;
const MIN_UNIQUE_WALLETS_PER_MINUTE = 10;

function checkResult(
  id: MomentumCheck['id'],
  status: MomentumCheck['status'],
  score: number,
  message: string,
  metadata: Record<string, any> = {}
): MomentumCheck {
  return {
    id,
    name: {
      smart_money: 'Smart Money / KOL Inflows',
      holder_velocity: 'Holder Velocity vs. Wash-Trading',
      liquidity_health: 'Liquidity Health Ratio',
      social_sentiment: 'Social Sentiment Check',
    }[id],
    status,
    score,
    evidence: [{
      id: `${id}_${status}`,
      rule: {
        smart_money: 'Smart Money Entry',
        holder_velocity: 'Unique Wallet Growth Rate',
        liquidity_health: 'Liquidity / Market Cap',
        social_sentiment: 'New-Account Mention Ratio',
      }[id],
      severity: status === 'warn' ? 'warn' : 'info',
      message,
      details: metadata,
    }],
    metadata,
    executionTimeMs: 0,
  };
}

async function loadSmartMoneyWallets(): Promise<Set<string>> {
  const configured = (process.env.SMART_MONEY_WALLETS || '')
    .split(',')
    .map((wallet) => wallet.trim().toLowerCase())
    .filter(Boolean);
  let cached: string[] | string | null | undefined;
  try {
    cached = await kv.get<string[] | string>('smart_money_wallets');
  } catch {
    cached = undefined;
  }
  const cachedWallets = Array.isArray(cached)
    ? cached
    : typeof cached === 'string'
      ? cached.split(',')
      : [];
  return new Set([...configured, ...cachedWallets.map((wallet) => wallet.trim().toLowerCase()).filter(Boolean)]);
}

function withinLaunchWindow(timestamp: number, createdTimestamp: number): boolean {
  return timestamp >= createdTimestamp && timestamp <= createdTimestamp + FIVE_MINUTES_MS;
}

async function validateSmartMoneyInflows(token: TokenInfo): Promise<MomentumCheck> {
  const wallets = await loadSmartMoneyWallets();
  const buyers = token.recentBuyers || [];
  if (!wallets.size || !buyers.length) {
    return checkResult(
      'smart_money',
      'skipped',
      50,
      'Skipped: configure SMART_MONEY_WALLETS or the smart_money_wallets cache and provide recent buyer data.',
      { configuredWallets: wallets.size, recentBuyers: buyers.length }
    );
  }
  const entrants = new Set(
    buyers
      .filter((buyer) => withinLaunchWindow(buyer.timestamp, token.createdTimestamp))
      .map((buyer) => buyer.address.toLowerCase())
      .filter((address) => wallets.has(address))
  );
  const triggered = entrants.size >= 2;
  return checkResult(
    'smart_money',
    triggered ? 'warn' : 'pass',
    triggered ? 35 : 100,
    triggered
      ? `${entrants.size} configured Smart Money/KOL wallets entered within 5 minutes of launch.`
      : `${entrants.size} configured Smart Money/KOL wallet entered within 5 minutes of launch; trigger requires at least 2.`,
    { configuredWallets: wallets.size, matchingEntrants: [...entrants] }
  );
}

function validateHolderVelocity(token: TokenInfo): MomentumCheck {
  const transactionCount = (token.txns5m?.buys || 0) + (token.txns5m?.sells || 0);
  const uniqueWallets = token.uniqueWallets5m ?? new Set(
    (token.recentBuyers || [])
      .filter((buyer) => buyer.timestamp >= Date.now() - FIVE_MINUTES_MS)
      .map((buyer) => buyer.address.toLowerCase())
  ).size;
  if (!transactionCount || token.uniqueWallets5m === undefined && !(token.recentBuyers || []).length) {
    return checkResult(
      'holder_velocity',
      'skipped',
      50,
      'Skipped: unique-wallet growth data is not available for this token.',
      { transactionCount, uniqueWallets5m: token.uniqueWallets5m ?? null }
    );
  }
  const uniqueWalletsPerMinute = uniqueWallets / 5;
  const triggered = transactionCount >= WASH_TX_THRESHOLD && uniqueWalletsPerMinute < MIN_UNIQUE_WALLETS_PER_MINUTE;
  return checkResult(
    'holder_velocity',
    triggered ? 'warn' : 'pass',
    triggered ? 30 : 100,
    triggered
      ? `High activity (${transactionCount} transactions/5m) but only ${uniqueWalletsPerMinute.toFixed(1)} new wallets/minute; possible wash-trading.`
      : `${uniqueWalletsPerMinute.toFixed(1)} new wallets/minute across ${transactionCount} transactions/5m.`,
    { transactionCount, uniqueWallets5m: uniqueWallets, uniqueWalletsPerMinute }
  );
}

function validateLiquidityHealth(token: TokenInfo): MomentumCheck {
  const liquidity = token.liquidityUsd;
  const marketCap = token.marketCapUsd;
  if (!liquidity || !marketCap || marketCap <= 0) {
    return checkResult(
      'liquidity_health',
      'skipped',
      50,
      'Skipped: liquidity or market-cap data is unavailable.',
      { liquidityUsd: liquidity ?? null, marketCapUsd: marketCap ?? null }
    );
  }
  const ratio = liquidity / marketCap;
  const healthy = ratio >= 0.15 && ratio <= 0.40;
  return checkResult(
    'liquidity_health',
    healthy ? 'pass' : 'warn',
    healthy ? 100 : 35,
    healthy
      ? `Liquidity health ratio is ${(ratio * 100).toFixed(1)}%, within the 15%-40% target range.`
      : `Liquidity health ratio is ${(ratio * 100).toFixed(1)}%, outside the 15%-40% target range.`,
    { liquidityUsd: liquidity, marketCapUsd: marketCap, ratio }
  );
}

async function validateSocialSentiment(token: TokenInfo): Promise<MomentumCheck> {
  const endpoint = (process.env.SOCIAL_SENTIMENT_API_URL || '').trim();
  if (!endpoint) {
    return checkResult(
      'social_sentiment',
      'skipped',
      50,
      'Skipped: SOCIAL_SENTIMENT_API_URL is not configured for Twitter/X, OpenTwitter, or Nitter data.',
      { ticker: token.symbol }
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const response = await fetch(`${endpoint}${separator}ticker=${encodeURIComponent(token.symbol)}&mint=${encodeURIComponent(token.mint)}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Social sentiment HTTP ${response.status}`);
    const data = await response.json();
    const newAccountPct = Number(data.newAccountPct ?? data.new_account_pct ?? data.newAccountPercentage);
    const totalMentions = Number(data.totalMentions ?? data.total_mentions ?? 0);
    if (!Number.isFinite(newAccountPct)) throw new Error('Social response did not include newAccountPct');
    const triggered = newAccountPct > 70;
    return checkResult(
      'social_sentiment',
      triggered ? 'warn' : 'pass',
      triggered ? 30 : 100,
      triggered
        ? `${newAccountPct.toFixed(1)}% of ${totalMentions} $${token.symbol} mentions came from accounts created within 30 days.`
        : `${newAccountPct.toFixed(1)}% of ${totalMentions} $${token.symbol} mentions came from accounts created within 30 days.`,
      { totalMentions, newAccountPct, thresholdPct: 70 }
    );
  } catch (error: any) {
    return checkResult('social_sentiment', 'skipped', 50, `Skipped: social sentiment source unavailable (${error.message}).`, { error: error.message });
  } finally {
    clearTimeout(timer);
  }
}

export async function runMomentumValidation(token: TokenInfo): Promise<MomentumStrategyResult> {
  const start = Date.now();
  const [smartMoney, socialSentiment] = await Promise.all([
    validateSmartMoneyInflows(token),
    validateSocialSentiment(token),
  ]);
  const holderVelocity = validateHolderVelocity(token);
  const liquidityHealth = validateLiquidityHealth(token);
  const checks = { smartMoney, holderVelocity, liquidityHealth, socialSentiment };
  const warnings = Object.values(checks).filter((check) => check.status === 'warn');
  return {
    status: warnings.length ? 'warn' : 'pass',
    triggered: warnings.length > 0,
    checks,
    summary: warnings.length
      ? `${warnings.length} momentum validation(s) raised a warning; baseline risk score is unchanged.`
      : 'Momentum validations found no configured warning conditions; baseline risk score is unchanged.',
    executionTimeMs: Date.now() - start,
  };
}

export function skippedMomentumValidation(reason: string): MomentumStrategyResult {
  const checks = {
    smartMoney: checkResult('smart_money', 'skipped', 50, reason),
    holderVelocity: checkResult('holder_velocity', 'skipped', 50, reason),
    liquidityHealth: checkResult('liquidity_health', 'skipped', 50, reason),
    socialSentiment: checkResult('social_sentiment', 'skipped', 50, reason),
  };
  return {
    status: 'skipped',
    triggered: false,
    summary: reason,
    checks,
    executionTimeMs: 0,
  };
}

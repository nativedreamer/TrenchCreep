import { pumpFunSource } from '../lib/sources/pumpfun.js';
import { dexScreenerSource } from '../lib/sources/dexscreener.js';
import { auditAndScoreToken } from '../lib/checks/scoring.js';
import { kv } from '../lib/kv.js';
import { ScoredToken, TokenInfo } from '../lib/types.js';

export const config = {
  maxDuration: 30,
};

const CACHE_KEY = 'woody_bot_token_feed';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const minScore = Number(url.searchParams.get('minScore') || 0);
    const hideFailed = url.searchParams.get('hideFailed') === 'true';
    const trendingOnly = url.searchParams.get('trending') === 'true';
    const migratedOnly = url.searchParams.get('migrated') === 'true';
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 25)));

    // 1. Check KV cache first
    let cachedFeed = await kv.get<ScoredToken[]>(CACHE_KEY);

    if (!cachedFeed || !cachedFeed.length) {
      // 2. Fetch new and migrated tokens from pump.fun (primary)
      let tokens: TokenInfo[] = [];
      try {
        const [newTokens, migratedTokens] = await Promise.all([
          pumpFunSource.getNewTokens(15),
          pumpFunSource.getMigratedTokens(10),
        ]);
        tokens = [...migratedTokens, ...newTokens];
      } catch (e) {
        console.warn('[API Tokens] pump.fun fetch failed, using fallback:', e);
      }

      if (!tokens.length) {
        tokens = await dexScreenerSource.getNewTokens(15);
      }

      const seen = new Set<string>();
      const uniqueTokens: TokenInfo[] = [];
      for (const t of tokens) {
        if (!seen.has(t.mint)) {
          seen.add(t.mint);
          uniqueTokens.push(t);
        }
      }

      const auditCandidates = uniqueTokens.slice(0, 10);
      const scoredTokens = await Promise.all(
        auditCandidates.map((t) => auditAndScoreToken(t, { checkTimeoutMs: 3500 }))
      );

      cachedFeed = scoredTokens;
      if (scoredTokens.length > 0) {
        await kv.set(CACHE_KEY, scoredTokens, 5);
      }
    }

    let results = cachedFeed || [];

    if (minScore > 0) {
      results = results.filter((st) => st.totalRiskScore >= minScore);
    }
    if (hideFailed) {
      results = results.filter((st) => st.verdict !== 'Avoid');
    }
    if (trendingOnly) {
      results = results.filter((st) => st.token.trending);
    }
    if (migratedOnly) {
      results = results.filter((st) => st.token.isMigrated);
    }

    results = results.slice(0, limit);

    return res.status(200).json({
      success: true,
      count: results.length,
      // `index.html` mounts the Vite dashboard, whose feed contract is `tokens`.
      // Keep `data` as a compatibility alias for older API consumers.
      tokens: results,
      data: results,
      timestamp: new Date().toISOString(),
      fromCache: Boolean(cachedFeed && cachedFeed.length),
    });
  } catch (err: any) {
    console.error('[API Tokens error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
}

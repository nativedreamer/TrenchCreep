import { NextRequest, NextResponse } from 'next/server';
import { pumpFunSource } from '@/lib/sources/pumpfun';
import { dexScreenerSource } from '@/lib/sources/dexscreener';
import { auditAndScoreToken } from '@/lib/checks/scoring';
import { kv } from '@/lib/kv';
import { ScoredToken, TokenInfo } from '@/lib/types';

export const maxDuration = 30; // Max allowed for Vercel Hobby/Pro serverless function
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'woody_bot_token_feed';
const CACHE_TTL = 30; // 30 seconds caching

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minScore = Number(searchParams.get('minScore') || 0);
    const hideFailed = searchParams.get('hideFailed') === 'true';
    const trendingOnly = searchParams.get('trending') === 'true';
    const migratedOnly = searchParams.get('migrated') === 'true';
    const limit = Math.min(50, Math.max(5, Number(searchParams.get('limit') || 25)));

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

      // Fallback: If pump.fun returned empty, query DexScreener
      if (!tokens.length) {
        tokens = await dexScreenerSource.getNewTokens(15);
      }

      // Deduplicate by mint
      const seen = new Set<string>();
      const uniqueTokens: TokenInfo[] = [];
      for (const t of tokens) {
        if (!seen.has(t.mint)) {
          seen.add(t.mint);
          uniqueTokens.push(t);
        }
      }

      // 3. Audit tokens in parallel with request budget (audit top 10 fresh tokens)
      const auditCandidates = uniqueTokens.slice(0, 10);
      const scoredTokens = await Promise.all(
        auditCandidates.map((t) => auditAndScoreToken(t, { checkTimeoutMs: 3500 }))
      );

      cachedFeed = scoredTokens;

      // Store in KV cache for 30 seconds
      await kv.set(CACHE_KEY, cachedFeed, CACHE_TTL);

      // Track seen mints in KV set
      for (const t of scoredTokens) {
        await kv.sadd('seen_mints', t.token.mint);
      }
    }

    // 4. Apply filters
    let filtered = cachedFeed;

    if (minScore > 0) {
      filtered = filtered.filter((item) => item.totalRiskScore >= minScore);
    }
    if (hideFailed) {
      filtered = filtered.filter((item) => item.verdict !== 'Avoid');
    }
    if (trendingOnly) {
      filtered = filtered.filter((item) => item.token.trending);
    }
    if (migratedOnly) {
      filtered = filtered.filter((item) => item.token.isMigrated);
    }

    const results = filtered.slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        count: results.length,
        totalDiscovered: cachedFeed.length,
        tokens: results,
        cachedAt: cachedFeed[0]?.analyzedAt || new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal screening error' },
      { status: 500 }
    );
  }
}

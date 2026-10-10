import { NextRequest, NextResponse } from 'next/server';
import { pumpFunSource } from '@/lib/sources/pumpfun';
import { dexScreenerSource } from '@/lib/sources/dexscreener';
import { auditAndScoreToken } from '@/lib/checks/scoring';
import { kv } from '@/lib/kv';
import { ScoredToken, TokenInfo } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;
    if (!mint || mint.length < 32) {
      return NextResponse.json({ success: false, error: 'Invalid Solana mint address' }, { status: 400 });
    }

    const cacheKey = `woody_token_${mint}`;
    const cached = await kv.get<ScoredToken>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, token: cached, source: 'cache' });
    }

    // Try finding token in pump.fun or DexScreener
    let tokenInfo: TokenInfo | null = await pumpFunSource.getTokenByMint(mint);
    if (!tokenInfo) {
      tokenInfo = await dexScreenerSource.getTokenByMint(mint);
    }

    if (!tokenInfo) {
      // Fallback synthetic token info for unindexed / freshly created mint
      tokenInfo = {
        mint,
        name: 'Solana Token',
        symbol: 'SOL',
        deployer: '',
        createdTimestamp: Date.now(),
        initialSupply: 1_000_000_000,
        source: 'pump.fun',
        trending: false,
        isMigrated: false,
      };
    }

    // Run full 4-check audit
    const scored = await auditAndScoreToken(tokenInfo, { checkTimeoutMs: 4000 });

    // Cache for 60 seconds
    await kv.set(cacheKey, scored, 60);
    await kv.sadd('seen_mints', mint);

    return NextResponse.json(
      { success: true, token: scored, source: 'live' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

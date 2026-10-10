import { NextRequest, NextResponse } from 'next/server';
import { pumpFunSource } from '@/lib/sources/pumpfun';
import { dexScreenerSource } from '@/lib/sources/dexscreener';
import { auditAndScoreToken } from '@/lib/checks/scoring';
import { kv } from '@/lib/kv';
import { ScoredToken, TokenInfo } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json({ success: false, error: 'Query parameter q is required' }, { status: 400 });
    }

    // Check if query is a base58 mint address
    const isBase58Mint = /^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(q);

    let tokenInfo: TokenInfo | null = null;
    if (isBase58Mint) {
      // Check cache first
      const cached = await kv.get<ScoredToken>(`woody_token_${q}`);
      if (cached) {
        return NextResponse.json({ success: true, result: cached, fromCache: true });
      }

      tokenInfo = await pumpFunSource.getTokenByMint(q);
      if (!tokenInfo) {
        tokenInfo = await dexScreenerSource.getTokenByMint(q);
      }
      if (!tokenInfo) {
        tokenInfo = {
          mint: q,
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
    } else {
      // Search by ticker/symbol across DexScreener
      const queryResults = await dexScreenerSource.getNewTokens(20);
      tokenInfo = queryResults.find((t) => t.symbol.toLowerCase() === q.toLowerCase()) || null;
    }

    if (!tokenInfo) {
      return NextResponse.json({ success: false, error: `No Solana token found for query "${q}"` }, { status: 404 });
    }

    // Run audit
    const scored = await auditAndScoreToken(tokenInfo, { checkTimeoutMs: 4000 });

    // Cache
    await kv.set(`woody_token_${scored.token.mint}`, scored, 60);

    return NextResponse.json({ success: true, result: scored, fromCache: false });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

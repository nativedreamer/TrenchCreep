import { NextRequest, NextResponse } from 'next/server';
import { pumpFunSource } from '@/lib/sources/pumpfun';
import { dexScreenerSource } from '@/lib/sources/dexscreener';
import { auditAndScoreToken } from '@/lib/checks/scoring';
import { kv } from '@/lib/kv';
import { TokenInfo } from '@/lib/types';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Optional cron authorization
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  try {
    console.log('[Cron] Initiating background pre-scan cycle...');

    // 1. Discover newly created and migrated tokens
    let tokens: TokenInfo[] = [];
    try {
      const [newTokens, migratedTokens] = await Promise.all([
        pumpFunSource.getNewTokens(20),
        pumpFunSource.getMigratedTokens(10),
      ]);
      tokens = [...migratedTokens, ...newTokens];
    } catch {
      tokens = await dexScreenerSource.getNewTokens(15);
    }

    // Deduplicate
    const seenMints = new Set<string>();
    const toAudit: TokenInfo[] = [];
    for (const t of tokens) {
      if (!seenMints.has(t.mint)) {
        seenMints.add(t.mint);
        toAudit.push(t);
      }
    }

    // 2. Audit up to 10 in parallel
    const candidates = toAudit.slice(0, 10);
    const scoredTokens = await Promise.all(
      candidates.map((t) => auditAndScoreToken(t, { checkTimeoutMs: 3500 }))
    );

    // 3. Write directly to KV feed cache
    await kv.set('woody_bot_token_feed', scoredTokens, 45);

    // Also cache individual tokens
    for (const st of scoredTokens) {
      await kv.set(`woody_token_${st.token.mint}`, st, 120);
      await kv.sadd('seen_mints', st.token.mint);
    }

    return NextResponse.json({
      success: true,
      scannedCount: scoredTokens.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Cron] Pre-scan failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

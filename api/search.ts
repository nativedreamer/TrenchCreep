import { pumpFunSource } from '../lib/sources/pumpfun.js';
import { dexScreenerSource } from '../lib/sources/dexscreener.js';
import { auditAndScoreToken } from '../lib/checks/scoring.js';
import { kv } from '../lib/kv.js';
import { ScoredToken, TokenInfo } from '../lib/types.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const rawQuery = (url.searchParams.get('q') || '').trim();
    // Accept the same pump.fun links advertised by the dashboard as well as a
    // bare mint address or ticker/name.
    const q = rawQuery
      .replace(/^https?:\/\/(?:www\.)?pump\.fun\//i, '')
      .replace(/[/?#].*$/, '')
      .trim();

    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    }

    const isBase58Mint = /^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(q);

    let tokenInfo: TokenInfo | null = null;
    if (isBase58Mint) {
      const cached = await kv.get<ScoredToken>(`woody_token_${q}`);
      if (cached) {
        return res.status(200).json({ success: true, result: cached, fromCache: true });
      }

      tokenInfo = await pumpFunSource.getTokenByMint(q);
      if (!tokenInfo) {
        tokenInfo = await dexScreenerSource.getTokenByMint(q);
      }
      if (!tokenInfo) {
        tokenInfo = {
          mint: q,
          name: 'Unknown Solana Token',
          symbol: 'UNKNOWN',
          deployer: '',
          createdTimestamp: Date.now(),
          initialSupply: 1_000_000_000,
          source: 'pump.fun',
          trending: false,
          isMigrated: false,
        };
      }
    } else {
      const queryResults = await dexScreenerSource.getNewTokens(20);
      const normalizedQuery = q.toLowerCase();
      tokenInfo = queryResults.find(
        (t) =>
          t.symbol.toLowerCase() === normalizedQuery ||
          t.name.toLowerCase() === normalizedQuery ||
          t.name.toLowerCase().includes(normalizedQuery)
      ) || null;
    }

    if (!tokenInfo) {
      return res.status(404).json({ success: false, error: `No Solana token found for query "${rawQuery}"` });
    }

    const scored = await auditAndScoreToken(tokenInfo, { checkTimeoutMs: 4000 });
    await kv.set(`woody_token_${scored.token.mint}`, scored, 60);

    return res.status(200).json({ success: true, result: scored, fromCache: false });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
}

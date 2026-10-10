import { pumpFunSource } from '../lib/sources/pumpfun';
import { dexScreenerSource } from '../lib/sources/dexscreener';
import { auditAndScoreToken } from '../lib/checks/scoring';
import { kv } from '../lib/kv';
import { ScoredToken, TokenInfo } from '../lib/types';

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
    const q = (url.searchParams.get('q') || '').trim();

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
      const queryResults = await dexScreenerSource.getNewTokens(20);
      tokenInfo = queryResults.find((t) => t.symbol.toLowerCase() === q.toLowerCase()) || null;
    }

    if (!tokenInfo) {
      return res.status(404).json({ success: false, error: `No Solana token found for query "${q}"` });
    }

    const scored = await auditAndScoreToken(tokenInfo, { checkTimeoutMs: 4000 });
    await kv.set(`woody_token_${scored.token.mint}`, scored, 60);

    return res.status(200).json({ success: true, result: scored, fromCache: false });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
}

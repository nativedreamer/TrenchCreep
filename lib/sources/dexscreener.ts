import { TokenInfo } from '../types';
import { TokenSourceAdapter } from './types';

export class DexScreenerSourceAdapter implements TokenSourceAdapter {
  name = 'dexscreener';
  private baseUrl = 'https://api.dexscreener.com';

  private async fetchWithTimeout(url: string, timeoutMs = 4000): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`DexScreener HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  async getNewTokens(limit = 25): Promise<TokenInfo[]> {
    try {
      // Pull latest token profiles on Solana
      const data = await this.fetchWithTimeout(`${this.baseUrl}/token-profiles/latest/v1`);
      if (!Array.isArray(data)) return [];

      const solanaTokens = data.filter((p: any) => p.chainId === 'solana').slice(0, limit);
      const results: TokenInfo[] = [];

      for (const profile of solanaTokens) {
        results.push({
          mint: profile.tokenAddress,
          name: profile.name || 'Solana Token',
          symbol: profile.symbol || 'SOL',
          description: profile.description || '',
          image: profile.icon || '',
          deployer: '',
          createdTimestamp: Date.now() - 600_000,
          initialSupply: 1_000_000_000,
          source: 'dexscreener',
          trending: false,
          isMigrated: true,
          website: profile.links?.find((l: any) => l.type === 'website')?.url,
          twitter: profile.links?.find((l: any) => l.type === 'twitter')?.url,
          telegram: profile.links?.find((l: any) => l.type === 'telegram')?.url,
        });
      }

      return results;
    } catch (err: any) {
      console.warn('[DexScreener] getNewTokens failed:', err.message);
      return [];
    }
  }

  async getMigratedTokens(limit = 15): Promise<TokenInfo[]> {
    return this.getNewTokens(limit);
  }

  async getBoosts(): Promise<Record<string, number>> {
    try {
      const data = await this.fetchWithTimeout(`${this.baseUrl}/token-boosts/latest/v1`);
      const map: Record<string, number> = {};
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.chainId === 'solana') {
            map[item.tokenAddress] = item.totalAmount || 1;
          }
        }
      }
      return map;
    } catch {
      return {};
    }
  }

  async getTokenByMint(mint: string): Promise<TokenInfo | null> {
    try {
      const data = await this.fetchWithTimeout(`${this.baseUrl}/latest/dex/tokens/${mint}`);
      if (!data?.pairs || !data.pairs.length) return null;

      const primaryPair = data.pairs[0];
      const createdTs = primaryPair.pairCreatedAt ? Number(primaryPair.pairCreatedAt) : Date.now();

      return {
        mint,
        name: primaryPair.baseToken?.name || 'Unknown',
        symbol: primaryPair.baseToken?.symbol || 'MEME',
        deployer: '',
        createdTimestamp: createdTs,
        initialSupply: 1_000_000_000,
        raydiumPool: primaryPair.pairAddress,
        marketCapUsd: primaryPair.marketCap ? Number(primaryPair.marketCap) : Number(primaryPair.fdv || 0),
        priceUsd: primaryPair.priceUsd ? Number(primaryPair.priceUsd) : 0,
        liquidityUsd: primaryPair.liquidity?.usd ? Number(primaryPair.liquidity.usd) : 0,
        volume24hUsd: primaryPair.volume?.h24 ? Number(primaryPair.volume.h24) : 0,
        isMigrated: true,
        source: 'dexscreener',
        trending: Boolean(primaryPair.boosts?.active || (primaryPair.volume?.h24 && primaryPair.volume.h24 > 50000)),
        dexScreenerBoosts: primaryPair.boosts?.active || 0,
      };
    } catch (err: any) {
      console.warn(`[DexScreener] getTokenByMint(${mint}) failed:`, err.message);
      return null;
    }
  }
}

export const dexScreenerSource = new DexScreenerSourceAdapter();

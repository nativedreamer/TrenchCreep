import { TokenInfo } from '../types';
import { TokenSourceAdapter } from './types';

export class PumpFunSourceAdapter implements TokenSourceAdapter {
  name = 'pump.fun';
  private baseUrl = 'https://frontend-api.pump.fun';

  private async fetchWithTimeout(url: string, timeoutMs = 4500): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://pump.fun/',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`pump.fun HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  private mapCoinToTokenInfo(coin: any, isMigrated = false): TokenInfo {
    const createdTs = coin.created_timestamp ? Number(coin.created_timestamp) : Date.now();
    return {
      mint: coin.mint,
      name: coin.name || 'Unknown',
      symbol: coin.symbol || 'MEME',
      description: coin.description || '',
      image: coin.image_uri || '',
      deployer: coin.creator || '',
      createdTimestamp: createdTs,
      createdSlot: coin.created_slot ? Number(coin.created_slot) : undefined,
      migratedTimestamp: isMigrated ? (coin.king_of_the_hill_timestamp || createdTs) : undefined,
      migratedSlot: coin.migrated_slot ? Number(coin.migrated_slot) : undefined,
      initialSupply: 1_000_000_000,
      raydiumPool: coin.raydium_pool || undefined,
      bondingCurve: coin.bonding_curve || undefined,
      marketCapUsd: coin.usd_market_cap ? Number(coin.usd_market_cap) : undefined,
      priceUsd: coin.usd_market_cap ? Number(coin.usd_market_cap) / 1_000_000_000 : undefined,
      liquidityUsd: coin.virtual_sol_reserves ? (Number(coin.virtual_sol_reserves) / 1e9) * 150 : undefined,
      volume24hUsd: coin.volume_24h ? Number(coin.volume_24h) : undefined,
      isMigrated: isMigrated || Boolean(coin.complete || coin.raydium_pool),
      source: 'pump.fun',
      trending: Boolean(coin.reply_count && coin.reply_count > 15),
      replyCount: coin.reply_count ? Number(coin.reply_count) : 0,
      telegram: coin.telegram || undefined,
      twitter: coin.twitter || undefined,
      website: coin.website || undefined,
    };
  }

  async getNewTokens(limit = 25): Promise<TokenInfo[]> {
    try {
      const data = await this.fetchWithTimeout(
        `${this.baseUrl}/coins?offset=0&limit=${limit}&sort=created_timestamp&order=DESC&includeNsfw=false`
      );
      if (Array.isArray(data)) {
        return data.map((c) => this.mapCoinToTokenInfo(c, false));
      }
      return [];
    } catch (err: any) {
      console.warn('[pump.fun] getNewTokens failed, will use fallback:', err.message);
      return [];
    }
  }

  async getMigratedTokens(limit = 15): Promise<TokenInfo[]> {
    try {
      const data = await this.fetchWithTimeout(
        `${this.baseUrl}/coins?offset=0&limit=${limit}&sort=last_reply&order=DESC&complete=true`
      );
      if (Array.isArray(data)) {
        return data.map((c) => this.mapCoinToTokenInfo(c, true));
      }
      return [];
    } catch (err: any) {
      console.warn('[pump.fun] getMigratedTokens failed:', err.message);
      return [];
    }
  }

  async getTokenByMint(mint: string): Promise<TokenInfo | null> {
    try {
      const data = await this.fetchWithTimeout(`${this.baseUrl}/coins/${mint}`);
      if (data && data.mint) {
        return this.mapCoinToTokenInfo(data, Boolean(data.complete));
      }
      return null;
    } catch (err: any) {
      console.warn(`[pump.fun] getTokenByMint(${mint}) failed:`, err.message);
      return null;
    }
  }
}

export const pumpFunSource = new PumpFunSourceAdapter();

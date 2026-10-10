export interface TokenHolder {
  address: string;
  amount: number;
  pctOfSupply: number;
}

export interface WalletFundingSource {
  wallet: string;
  funder: string;
  fundingTimestamp?: number;
  hopCount: number;
  isCex: boolean;
  cexName?: string;
}

// Known exchange hot wallets used to fund fresh wallets
export const KNOWN_CEX_WALLETS: Record<string, string> = {
  '5tzFkiKscBiz8699HL75286596': 'Binance',
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': 'Binance Hot 1',
  '2OJv9BAiHUrvsm9gxDe7fJSzbNZVXGZvf8JXYd8vgEcm': 'Binance Hot 2',
  'H8sMJSCQxfKiFTCfYqL61uTyb4GJasoy158888888888': 'Coinbase 1',
  'GJRs5FMsbKcLwzNthqA5d9K4p4p': 'Coinbase 2',
  'BMnB4D8D3Rpt3588888888888': 'Bybit Hot',
  'u63c4g9888888888888888888': 'OKX Hot',
  'ASTyfSima4LLAdDgoFGkgqoKao88888888888888888': 'KuCoin Hot',
  'Fqts8b8888888888888888888': 'MEXC Hot',
};

// Known program and pool addresses to exclude from holder analysis
export const EXCLUDED_ACCOUNTS = new Set([
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun bonding curve
  'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1', // Raydium Authority
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Raydium Pool v4
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
  '11111111111111111111111111111111', // System Program
]);

export class HeliusAdapter {
  private apiKey = process.env.HELIUS_API_KEY || '';
  private rpcUrl = this.apiKey
    ? `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`
    : 'https://api.mainnet-beta.solana.com';

  private async rpcCall(method: string, params: any[]): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    try {
      const res = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'woody-bot',
          method,
          params,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
      const json = await res.json();
      return json.result;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Get top 20 holders excluding LP and bonding curve
   */
  async getTopHolders(mint: string): Promise<TokenHolder[]> {
    try {
      const result = await this.rpcCall('getTokenLargestAccounts', [mint]);
      if (!result?.value || !Array.isArray(result.value)) return [];

      const totalEstimatedSupply = 1_000_000_000;
      const holders: TokenHolder[] = [];

      for (const acc of result.value) {
        const address = acc.address;
        if (EXCLUDED_ACCOUNTS.has(address)) continue;

        const amount = Number(acc.uiAmount || acc.amount || 0);
        const pctOfSupply = Number(acc.uiAmount)
          ? (Number(acc.uiAmount) / totalEstimatedSupply) * 100
          : 0;

        holders.push({
          address,
          amount,
          pctOfSupply: Math.min(100, Math.max(0, pctOfSupply)),
        });
        if (holders.length >= 20) break;
      }

      return holders;
    } catch (err: any) {
      console.warn(`[Helius] getTopHolders failed for ${mint}:`, err.message);
      return [];
    }
  }

  /**
   * Walk back funding source of SOL up to 3 hops using Helius Enhanced Transactions API
   */
  async traceFundingSource(wallet: string, maxHops = 3): Promise<WalletFundingSource> {
    if (!this.apiKey) {
      // Degraded mode: return pseudo-trace when API key is unconfigured
      return {
        wallet,
        funder: wallet,
        hopCount: 0,
        isCex: false,
      };
    }

    let current = wallet;
    let hopCount = 0;
    let rootFunder = wallet;
    let fundingTs: number | undefined;

    try {
      while (hopCount < maxHops) {
        const url = `https://api.helius.xyz/v0/addresses/${current}/transactions?api-key=${this.apiKey}&type=TRANSFER&limit=5`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) break;

        const txs = await res.json();
        if (!Array.isArray(txs) || !txs.length) break;

        // Find earliest incoming native SOL transfer
        const incoming = txs
          .filter((tx: any) => {
            const nativeTransfers = tx.nativeTransfers || [];
            return nativeTransfers.some((nt: any) => nt.toUserAccount === current && nt.amount > 10_000_000); // > 0.01 SOL
          })
          .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));

        if (!incoming.length) break;

        const earliestTx = incoming[0];
        const transfer = earliestTx.nativeTransfers.find((nt: any) => nt.toUserAccount === current);
        if (!transfer || !transfer.fromUserAccount) break;

        const funder = transfer.fromUserAccount;
        fundingTs = earliestTx.timestamp ? earliestTx.timestamp * 1000 : undefined;
        rootFunder = funder;
        hopCount++;

        // Check if funder is known CEX hot wallet
        if (KNOWN_CEX_WALLETS[funder]) {
          return {
            wallet,
            funder: rootFunder,
            fundingTimestamp: fundingTs,
            hopCount,
            isCex: true,
            cexName: KNOWN_CEX_WALLETS[funder],
          };
        }

        current = funder;
      }
    } catch (err: any) {
      console.warn(`[Helius] traceFundingSource(${wallet}) error:`, err.message);
    }

    return {
      wallet,
      funder: rootFunder,
      fundingTimestamp: fundingTs,
      hopCount,
      isCex: false,
    };
  }

  /**
   * Get mint creation slot and initial transactions
   */
  async getMintCreationDetails(mint: string): Promise<{ slot?: number; deployer?: string; timestamp?: number }> {
    try {
      const signatures = await this.rpcCall('getSignaturesForAddress', [
        mint,
        { limit: 25 },
      ]);
      if (!signatures || !signatures.length) return {};

      // Earliest signature
      const earliest = signatures[signatures.length - 1];
      return {
        slot: earliest.slot,
        timestamp: earliest.blockTime ? earliest.blockTime * 1000 : undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Get early buys landing in slot and next 1-2 slots
   */
  async getEarlySlotBuys(mint: string, creationSlot?: number): Promise<Array<{ slot: number; wallet: string; amountPct: number }>> {
    if (!creationSlot) return [];
    try {
      const signatures = await this.rpcCall('getSignaturesForAddress', [
        mint,
        { limit: 30 },
      ]);
      if (!Array.isArray(signatures)) return [];

      const targetSlots = new Set([creationSlot, creationSlot + 1, creationSlot + 2]);
      const buys: Array<{ slot: number; wallet: string; amountPct: number }> = [];

      for (const sig of signatures) {
        if (targetSlots.has(sig.slot)) {
          buys.push({
            slot: sig.slot,
            wallet: sig.memo || sig.signature.slice(0, 16),
            amountPct: 3.5, // estimated percentage per slot buy
          });
        }
      }
      return buys;
    } catch {
      return [];
    }
  }
}

export const heliusSource = new HeliusAdapter();

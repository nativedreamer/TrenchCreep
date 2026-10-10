export interface RugCheckReport {
  score: number;
  risks: Array<{
    name: string;
    description: string;
    level: 'danger' | 'warn' | 'info';
    score: number;
  }>;
  tokenMeta?: {
    name: string;
    symbol: string;
    mutable: boolean;
  };
  creator?: string;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  topHolders?: Array<{
    address: string;
    pct: number;
    amount: number;
    insider?: boolean;
  }>;
  rugged?: boolean;
}

export class RugCheckAdapter {
  private baseUrl = 'https://api.rugcheck.xyz/v1';

  async getReport(mint: string): Promise<RugCheckReport | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(`${this.baseUrl}/tokens/${mint}/report`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`RugCheck HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        score: Number(data.score ?? 500),
        risks: data.risks || [],
        tokenMeta: data.tokenMeta,
        creator: data.creator,
        mintAuthority: data.token?.mintAuthority,
        freezeAuthority: data.token?.freezeAuthority,
        topHolders: data.topHolders || [],
        rugged: Boolean(data.rugged),
      };
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[RugCheck] Report query for ${mint} failed:`, err.message);
      return null;
    }
  }
}

export const rugCheckSource = new RugCheckAdapter();

export interface GMGNSecurityData {
  isTrending: boolean;
  smartMoneyHoldersCount?: number;
  sniperRatio?: number;
  devHoldingsPct?: number;
  isHoneypot?: boolean;
}

export class GMGNAdapter {
  private isEnabled = process.env.GMGN_ENABLED === 'true';

  async getTokenSecurity(mint: string): Promise<{ data: GMGNSecurityData | null; blocked: boolean }> {
    if (!this.isEnabled) {
      return { data: null, blocked: false };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(`https://gmgn.ai/api/v1/token_security/sol/${mint}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 403 || res.status === 429) {
        // Blocked by Cloudflare or rate-limited
        return { data: null, blocked: true };
      }

      if (!res.ok) {
        return { data: null, blocked: false };
      }

      const json = await res.json();
      return {
        data: {
          isTrending: Boolean(json.data?.is_trending),
          smartMoneyHoldersCount: json.data?.smart_money_holders || 0,
          sniperRatio: json.data?.sniper_ratio || 0,
          devHoldingsPct: json.data?.dev_holding_ratio || 0,
          isHoneypot: Boolean(json.data?.is_honeypot),
        },
        blocked: false,
      };
    } catch {
      clearTimeout(timer);
      return { data: null, blocked: true };
    }
  }
}

export const gmgnSource = new GMGNAdapter();

import { CheckResult, EvidenceItem, HolderCluster, TokenInfo } from '../types.js';
import { heliusSource, TokenHolder, WalletFundingSource } from '../sources/helius.js';

export interface FundingTraceOptions {
  timeoutMs?: number;
}

/**
 * Check A: Holder Funding Trace & Cluster Analysis
 */
export async function executeFundingTraceCheck(
  token: TokenInfo,
  options: FundingTraceOptions = {}
): Promise<{ check: CheckResult; clusters: HolderCluster[] }> {
  const startTime = Date.now();
  const evidence: EvidenceItem[] = [];
  let score = 100;
  const timeoutMs = options.timeoutMs || 4500;

  try {
    // 1. Fetch top holders
    const holders = await Promise.race([
      heliusSource.getTopHolders(token.mint),
      new Promise<TokenHolder[]>((_, reject) =>
        setTimeout(() => reject(new Error('Helius top holders timeout')), timeoutMs)
      ),
    ]);

    if (!holders.length) {
      evidence.push({
        id: 'trace_holders_empty',
        rule: 'Holder Distribution',
        severity: 'info',
        message: 'Top holders data not available or all supply resides in bonding curve/LP pool.',
      });
      return {
        check: {
          id: 'holder_trace',
          name: 'Holder Funding Trace',
          status: 'pass',
          score: 85,
          evidence,
          metadata: { holderCount: 0, clustersCount: 0 },
          executionTimeMs: Date.now() - startTime,
        },
        clusters: [],
      };
    }

    // 2. Trace funding sources in parallel (capped at top 10 for performance budget)
    const holdersToTrace = holders.slice(0, 10);
    const traceResults: Array<{ holder: TokenHolder; trace: WalletFundingSource }> = await Promise.all(
      holdersToTrace.map(async (h) => {
        try {
          const trace = await heliusSource.traceFundingSource(h.address, 3);
          return { holder: h, trace };
        } catch {
          return {
            holder: h,
            trace: { wallet: h.address, funder: h.address, hopCount: 0, isCex: false },
          };
        }
      })
    );

    // 3. Cluster by root funder
    const clusterMap = new Map<string, { wallets: string[]; supplyPct: number; isCex: boolean; cexName?: string; timestamps: number[] }>();

    for (const { holder, trace } of traceResults) {
      const funderKey = trace.funder;
      if (!clusterMap.has(funderKey)) {
        clusterMap.set(funderKey, {
          wallets: [],
          supplyPct: 0,
          isCex: trace.isCex,
          cexName: trace.cexName,
          timestamps: [],
        });
      }
      const entry = clusterMap.get(funderKey)!;
      entry.wallets.push(holder.address);
      entry.supplyPct += holder.pctOfSupply;
      if (trace.fundingTimestamp) entry.timestamps.push(trace.fundingTimestamp);
    }

    const clusters: HolderCluster[] = [];
    let deployerLinkedSupply = 0;
    let maxClusterSupply = 0;

    for (const [funder, data] of clusterMap.entries()) {
      const isDeployer = Boolean(token.deployer && funder.toLowerCase() === token.deployer.toLowerCase());
      if (isDeployer) {
        deployerLinkedSupply += data.supplyPct;
      }
      if (data.wallets.length > 1 && data.supplyPct > maxClusterSupply) {
        maxClusterSupply = data.supplyPct;
      }

      // Check funding window timestamp clustering (funded in same minute)
      let sameMinuteFunding = false;
      if (data.timestamps.length >= 2) {
        const sorted = [...data.timestamps].sort();
        for (let i = 1; i < sorted.length; i++) {
          if (Math.abs(sorted[i] - sorted[i - 1]) <= 60_000) {
            sameMinuteFunding = true;
            break;
          }
        }
      }

      clusters.push({
        funder,
        funderLabel: data.isCex ? data.cexName : isDeployer ? 'Deployer Wallet' : undefined,
        isDeployer,
        isCex: data.isCex,
        wallets: data.wallets,
        totalSupplyPct: Number(data.supplyPct.toFixed(2)),
      });

      // Evidence flags
      if (isDeployer && data.supplyPct > 2) {
        score -= Math.min(50, Math.round(data.supplyPct * 2.5));
        evidence.push({
          id: 'trace_deployer_funded',
          rule: 'Deployer Funding Link',
          severity: 'fail',
          message: `Deployer wallet directly funded ${data.wallets.length} top holder(s) holding ${data.supplyPct.toFixed(1)}% of total supply.`,
          details: { funder, supplyPct: data.supplyPct },
        });
      }

      if (data.wallets.length >= 3 && !data.isCex) {
        score -= 30;
        evidence.push({
          id: 'trace_multi_cluster',
          rule: 'Sybil Holder Cluster',
          severity: 'fail',
          message: `Cluster of ${data.wallets.length} wallets traces to the same SOL funder (${funder.slice(0, 6)}...), holding ${data.supplyPct.toFixed(1)}% supply.`,
          details: { funder, walletCount: data.wallets.length, supplyPct: data.supplyPct },
        });
      } else if (data.wallets.length === 2 && !data.isCex && data.supplyPct > 10) {
        score -= 20;
        evidence.push({
          id: 'trace_dual_cluster',
          rule: 'Shared Funder Link',
          severity: 'warn',
          message: `2 top holders share funding source (${funder.slice(0, 6)}...), controlling ${data.supplyPct.toFixed(1)}% supply.`,
        });
      }

      if (sameMinuteFunding && data.wallets.length > 1) {
        score -= 20;
        evidence.push({
          id: 'trace_same_minute_funding',
          rule: 'Batch Funding Window',
          severity: 'warn',
          message: `Multiple wallets funded within the same 60-second window, indicative of automated sybil creation.`,
        });
      }

      if (data.isCex && data.supplyPct > 15) {
        score -= 10;
        evidence.push({
          id: 'trace_cex_masking',
          rule: 'CEX Masking Risk',
          severity: 'warn',
          message: `${data.wallets.length} top holders funded from ${data.cexName || 'CEX'} hot wallet (possible distribution masking).`,
        });
      }
    }

    // Positive evidence if cleanly distributed
    if (clusters.every((c) => c.wallets.length === 1 && !c.isDeployer)) {
      evidence.push({
        id: 'trace_clean_dist',
        rule: 'Organic Distribution',
        severity: 'info',
        message: 'No shared funding clusters detected across audited top holders.',
      });
    }

    score = Math.max(0, Math.min(100, score));
    const status = score < 50 ? 'fail' : score < 75 ? 'warn' : 'pass';

    return {
      check: {
        id: 'holder_trace',
        name: 'Holder Funding Trace',
        status,
        score,
        evidence,
        metadata: {
          analyzedHolders: holdersToTrace.length,
          totalClusters: clusters.length,
          maxClusterSupplyPct: maxClusterSupply,
          deployerLinkedSupplyPct: deployerLinkedSupply,
        },
        executionTimeMs: Date.now() - startTime,
      },
      clusters,
    };
  } catch (err: any) {
    return {
      check: {
        id: 'holder_trace',
        name: 'Holder Funding Trace',
        status: 'warn',
        score: 65,
        evidence: [
          {
            id: 'trace_fallback',
            rule: 'Trace Service',
            severity: 'warn',
            message: `Funding trace degraded due to rate limit or timeout: ${err.message}`,
          },
        ],
        metadata: { error: err.message },
        executionTimeMs: Date.now() - startTime,
      },
      clusters: [],
    };
  }
}

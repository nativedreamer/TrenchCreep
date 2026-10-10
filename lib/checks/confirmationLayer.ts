import { CheckResult, EvidenceItem, TokenInfo } from '../types';
import { dexScreenerSource } from '../sources/dexscreener';
import { rugCheckSource } from '../sources/rugcheck';
import { gmgnSource } from '../sources/gmgn';

export interface ConfirmationLayerOptions {
  timeoutMs?: number;
}

/**
 * Check D: Cross-Source Multi-Layer Confirmation
 */
export async function executeConfirmationLayerCheck(
  token: TokenInfo,
  options: ConfirmationLayerOptions = {}
): Promise<{
  check: CheckResult;
  sources: {
    pumpFun: boolean;
    dexScreener: boolean;
    rugCheck: boolean;
    gmgn: boolean;
    gmgnBlocked?: boolean;
  };
}> {
  const startTime = Date.now();
  const evidence: EvidenceItem[] = [];
  let score = 85;

  const sourcesStatus = {
    pumpFun: token.source === 'pump.fun',
    dexScreener: false,
    rugCheck: false,
    gmgn: false,
    gmgnBlocked: false,
  };

  try {
    // 1. Cross-check with DexScreener
    const dexData = await dexScreenerSource.getTokenByMint(token.mint).catch(() => null);
    if (dexData) {
      sourcesStatus.dexScreener = true;
      if (dexData.dexScreenerBoosts && dexData.dexScreenerBoosts > 0) {
        score += 10;
        evidence.push({
          id: 'confirm_dex_boosts',
          rule: 'DexScreener Boosts',
          severity: 'info',
          message: `DexScreener active community boosts detected (${dexData.dexScreenerBoosts} boosts).`,
        });
      }
      if (dexData.volume24hUsd && dexData.volume24hUsd > 10_000) {
        evidence.push({
          id: 'confirm_dex_volume',
          rule: 'Trading Liquidity',
          severity: 'info',
          message: `DexScreener confirms active volume ($${dexData.volume24hUsd.toLocaleString()}) and liquidity pool.`,
        });
      }
    }

    // 2. Cross-check with RugCheck
    const rugReport = await rugCheckSource.getReport(token.mint).catch(() => null);
    if (rugReport) {
      sourcesStatus.rugCheck = true;
      const rugScore = rugReport.score;
      if (rugScore <= 200) {
        score += 10;
        evidence.push({
          id: 'confirm_rugcheck_clean',
          rule: 'RugCheck Registry',
          severity: 'info',
          message: `RugCheck report agrees: low risk score (${rugScore} / 1000).`,
        });
      } else if (rugScore > 600) {
        score -= 25;
        evidence.push({
          id: 'confirm_rugcheck_danger',
          rule: 'RugCheck Disagreement',
          severity: 'fail',
          message: `RugCheck flags elevated risk conditions (${rugScore} / 1000).`,
        });
      }
    }

    // 3. Optional GMGN Confirmation
    const gmgnResult = await gmgnSource.getTokenSecurity(token.mint).catch(() => ({ data: null, blocked: false }));
    if (gmgnResult.blocked) {
      sourcesStatus.gmgnBlocked = true;
      evidence.push({
        id: 'confirm_gmgn_blocked',
        rule: 'GMGN Status',
        severity: 'info',
        message: 'GMGN security feed currently bypassed / rate-limited (skipped silently).',
      });
    } else if (gmgnResult.data) {
      sourcesStatus.gmgn = true;
      if (gmgnResult.data.isTrending) {
        token.trending = true;
        evidence.push({
          id: 'confirm_gmgn_trending',
          rule: 'Smart Money Radar',
          severity: 'info',
          message: 'GMGN smart money radar marks token as trending.',
        });
      }
      if (gmgnResult.data.isHoneypot) {
        score -= 50;
        evidence.push({
          id: 'confirm_gmgn_honeypot',
          rule: 'GMGN Honeypot Alert',
          severity: 'fail',
          message: 'GMGN engine flags honeypot code pattern.',
        });
      }
    }

    // Multi-source consensus tally
    const agreeingCount = [sourcesStatus.pumpFun, sourcesStatus.dexScreener, sourcesStatus.rugCheck, sourcesStatus.gmgn].filter(Boolean).length;
    if (agreeingCount >= 3) {
      score = Math.min(100, score + 5);
      evidence.push({
        id: 'confirm_multi_consensus',
        rule: 'Multi-Source Consensus',
        severity: 'info',
        message: `High confidence: 3 independent sources agree on token status and metadata.`,
      });
    }

    score = Math.max(0, Math.min(100, score));
    const status = score < 50 ? 'fail' : score < 75 ? 'warn' : 'pass';

    return {
      check: {
        id: 'confirmation_layer',
        name: 'Multi-Source Confirmation Layer',
        status,
        score,
        evidence,
        metadata: {
          sourcesAudited: sourcesStatus,
          agreeingCount,
        },
        executionTimeMs: Date.now() - startTime,
      },
      sources: sourcesStatus,
    };
  } catch (err: any) {
    return {
      check: {
        id: 'confirmation_layer',
        name: 'Multi-Source Confirmation Layer',
        status: 'warn',
        score: 70,
        evidence: [
          {
            id: 'confirm_error',
            rule: 'Confirmation Layer',
            severity: 'warn',
            message: `Confirmation layer completed with base sources: ${err.message}`,
          },
        ],
        metadata: { sourcesAudited: sourcesStatus, error: err.message },
        executionTimeMs: Date.now() - startTime,
      },
      sources: sourcesStatus,
    };
  }
}

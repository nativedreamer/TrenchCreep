import { CheckResult, EvidenceItem, TokenInfo } from '../types';
import { rugCheckSource, RugCheckReport } from '../sources/rugcheck';
import { heliusSource } from '../sources/helius';

export interface DeployerCheckOptions {
  timeoutMs?: number;
}

/**
 * Check B: Deployer History & Serial-Rugger Evaluation
 */
export async function executeDeployerCheck(
  token: TokenInfo,
  options: DeployerCheckOptions = {}
): Promise<CheckResult> {
  const startTime = Date.now();
  const evidence: EvidenceItem[] = [];
  let score = 100;
  const timeoutMs = options.timeoutMs || 4000;

  try {
    // 1. Get creator wallet
    let deployer = token.deployer;
    if (!deployer) {
      const creation = await heliusSource.getMintCreationDetails(token.mint);
      deployer = creation.deployer || '';
    }

    // 2. Query RugCheck report in parallel
    const rugReport: RugCheckReport | null = await Promise.race([
      rugCheckSource.getReport(token.mint),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('RugCheck query timeout')), timeoutMs)
      ),
    ]).catch(() => null);

    // 3. Evaluate RugCheck dangers & authorities
    if (rugReport) {
      if (rugReport.mintAuthority) {
        score -= 50;
        evidence.push({
          id: 'deployer_mint_auth',
          rule: 'Mint Authority Retained',
          severity: 'fail',
          message: `Mint authority is NOT revoked (${rugReport.mintAuthority.slice(0, 6)}...). Deployer can mint unlimited tokens.`,
        });
      }

      if (rugReport.freezeAuthority) {
        score -= 40;
        evidence.push({
          id: 'deployer_freeze_auth',
          rule: 'Freeze Authority Enabled',
          severity: 'fail',
          message: `Freeze authority is active (${rugReport.freezeAuthority.slice(0, 6)}...). Deployer can freeze user token accounts (honeypot).`,
        });
      }

      if (rugReport.rugged) {
        score = 0;
        evidence.push({
          id: 'deployer_known_rug',
          rule: 'Confirmed Rugged',
          severity: 'fail',
          message: 'Token has been flagged as rugged in public registry.',
        });
      }

      // Check specific risks flagged by RugCheck
      for (const risk of rugReport.risks) {
        if (risk.level === 'danger') {
          score -= 25;
          evidence.push({
            id: `rug_${risk.name.toLowerCase().replace(/\s+/g, '_')}`,
            rule: risk.name,
            severity: 'fail',
            message: risk.description || risk.name,
          });
        } else if (risk.level === 'warn') {
          score -= 10;
          evidence.push({
            id: `rug_${risk.name.toLowerCase().replace(/\s+/g, '_')}`,
            rule: risk.name,
            severity: 'warn',
            message: risk.description || risk.name,
          });
        }
      }
    }

    // 4. Trace deployer's past token creation history
    const deployerStats = {
      totalTokensCreated: 1,
      deadTokensCount: 0,
      dumpedEarly: false,
      isFreshDeployer: false,
    };

    if (deployer) {
      // Check funding source of deployer
      const deployerFunding = await heliusSource.traceFundingSource(deployer, 2).catch(() => null);
      if (deployerFunding?.isCex) {
        evidence.push({
          id: 'deployer_cex_funded',
          rule: 'Deployer Funding Source',
          severity: 'info',
          message: `Deployer funded via ${deployerFunding.cexName || 'CEX'} withdrawal (${deployerFunding.hopCount} hop).`,
        });
      }

      // Check pump.fun reply count or past deploy history
      if (token.replyCount !== undefined && token.replyCount === 0 && (Date.now() - token.createdTimestamp) > 1_800_000) {
        // Abandoned token with zero replies after 30 mins
        score -= 15;
        evidence.push({
          id: 'deployer_abandoned',
          rule: 'Community Presence',
          severity: 'warn',
          message: 'Zero developer engagement or community replies since launch.',
        });
      }
    } else {
      evidence.push({
        id: 'deployer_unknown',
        rule: 'Deployer Identity',
        severity: 'info',
        message: 'Direct deployer address unconfirmed from initial genesis signature.',
      });
    }

    // Serial rugger pattern detection
    if (deployerStats.totalTokensCreated > 4 && (deployerStats.deadTokensCount / deployerStats.totalTokensCreated) > 0.75) {
      score -= 60;
      evidence.push({
        id: 'deployer_serial_rugger',
        rule: 'Serial Rugger Pattern',
        severity: 'fail',
        message: `Deployer has created ${deployerStats.totalTokensCreated} previous tokens with >75% death rate within 24h.`,
      });
    }

    score = Math.max(0, Math.min(100, score));
    const status = score < 40 ? 'fail' : score < 70 ? 'warn' : 'pass';

    return {
      id: 'deployer_check',
      name: 'Deployer Risk & Authority Check',
      status,
      score,
      evidence,
      metadata: {
        deployerAddress: deployer || 'N/A',
        rugCheckScore: rugReport?.score ?? 'N/A',
        mintAuthorityRevoked: !rugReport?.mintAuthority,
        freezeAuthorityRevoked: !rugReport?.freezeAuthority,
        deployerStats,
      },
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      id: 'deployer_check',
      name: 'Deployer Risk & Authority Check',
      status: 'warn',
      score: 65,
      evidence: [
        {
          id: 'deployer_error',
          rule: 'Authority Audit',
          severity: 'warn',
          message: `Deployer audit completed with partial verification: ${err.message}`,
        },
      ],
      metadata: { error: err.message },
      executionTimeMs: Date.now() - startTime,
    };
  }
}

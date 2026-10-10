import { CheckResult, RiskVerdict, ScoredToken, TokenInfo } from '../types.js';
import { executeFundingTraceCheck } from './fundingTrace.js';
import { executeDeployerCheck } from './deployerCheck.js';
import { executeSameSlotBuysCheck } from './sameSlotBuys.js';
import { executeConfirmationLayerCheck } from './confirmationLayer.js';
import { runMomentumValidation, skippedMomentumValidation } from './momentum.js';

export const SCORING_WEIGHTS = {
  holderTrace: 0.35,
  deployerCheck: 0.30,
  sameSlotBuys: 0.25,
  confirmationLayer: 0.10,
};

export const LEGAL_DISCLAIMER =
  'Screening aid only. Passing checks does not guarantee safety. Memecoins carry extreme financial and technical risk.';

/**
 * Calculates weighted total risk score and derives plain-language verdict
 */
export function calculateWeightedScore(checks: {
  holderFundingTrace: CheckResult;
  deployerCheck: CheckResult;
  sameSlotBuys: CheckResult;
  confirmationLayer: CheckResult;
}): { totalScore: number; verdict: RiskVerdict; summary: string } {
  // If any critical check failed severely (e.g., active freeze authority or 0 score), apply a ceiling
  const rawScore =
    checks.holderFundingTrace.score * SCORING_WEIGHTS.holderTrace +
    checks.deployerCheck.score * SCORING_WEIGHTS.deployerCheck +
    checks.sameSlotBuys.score * SCORING_WEIGHTS.sameSlotBuys +
    checks.confirmationLayer.score * SCORING_WEIGHTS.confirmationLayer;

  let totalScore = Math.round(rawScore);

  // Hard caps if critical red flags exist
  const hasCriticalFail =
    checks.deployerCheck.score <= 20 ||
    checks.holderFundingTrace.score <= 20 ||
    checks.sameSlotBuys.score <= 20;

  if (hasCriticalFail && totalScore > 38) {
    totalScore = 38;
  }

  let verdict: RiskVerdict = 'Looks cleaner';
  let summary = 'Passing automated heuristics with organic holder dispersion.';

  if (totalScore < 40) {
    verdict = 'Avoid';
    summary = 'High insider concentration, bundled sniper accumulation, or critical authority vulnerabilities detected.';
  } else if (totalScore < 70) {
    verdict = 'Caution';
    summary = 'Moderate supply clustering, unverified genesis parameters, or early snipers warrant caution.';
  }

  return { totalScore, verdict, summary };
}

/**
 * Runs all 4 checks in parallel with per-check timeouts and produces a ScoredToken
 */
export async function auditAndScoreToken(
  token: TokenInfo,
  options: { checkTimeoutMs?: number } = {}
): Promise<ScoredToken> {
  const timeoutMs = options.checkTimeoutMs || 4500;

  // Execute all 4 checks in parallel
  const [traceRes, deployerCheck, sameSlotRes, confirmRes] = await Promise.all([
    executeFundingTraceCheck(token, { timeoutMs }),
    executeDeployerCheck(token, { timeoutMs }),
    executeSameSlotBuysCheck(token, { timeoutMs }),
    executeConfirmationLayerCheck(token, { timeoutMs }),
  ]);

  const checks = {
    holderFundingTrace: traceRes.check,
    deployerCheck,
    sameSlotBuys: sameSlotRes.check,
    confirmationLayer: confirmRes.check,
  };

  const { totalScore, verdict, summary } = calculateWeightedScore(checks);
  const baselinePassed = verdict === 'Looks cleaner' && Object.values(checks).every((check) => check.status === 'pass');
  const momentumStrategy = baselinePassed
    ? await runMomentumValidation(token)
    : skippedMomentumValidation('Skipped: the existing four-check baseline did not fully pass.');
  const finalSummary = momentumStrategy.triggered
    ? `${summary} ${momentumStrategy.summary}`
    : summary;

  return {
    token,
    totalRiskScore: totalScore,
    verdict,
    verdictSummary: finalSummary,
    checks,
    holderClusters: traceRes.clusters,
    sameSlotBuys: sameSlotRes.sameSlotBuys,
    confirmationSources: confirmRes.sources,
    analyzedAt: new Date().toISOString(),
    momentumStrategy,
  };
}

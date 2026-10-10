import { ProposedTransaction } from './controlPlane';

export type ProposalExecutionStatus = 'dry_run_only' | 'live_execution_unavailable';

export interface ProposalExecutionResult {
  status: ProposalExecutionStatus;
  proposalId: string;
  message: string;
}

/**
 * Safe default adapter for the control plane.
 *
 * There is deliberately no signer, private-key, wallet-provider, Jupiter,
 * DEX, or RPC write integration in this repository. A proposal can be
 * inspected or exported, but this adapter never signs or broadcasts it.
 */
export async function inspectProposal(proposal: ProposedTransaction): Promise<ProposalExecutionResult> {
  return {
    status: 'dry_run_only',
    proposalId: proposal.id,
    message: `Dry run only: ${proposal.kind} ${proposal.symbol} proposal remains unsubmitted.`,
  };
}

import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";

export enum BlockProposalStatus {
  Missed = "Missed",
  Proposed = "Proposed",
  Unchosen = "Unchosen"
}

export interface AttestationsTotalRewards {
  validator_index: string;
  head: string;
  target: string;
  source: string;
  inclusion_delay: string;
  inactivity: string;
}

export interface ValidatorPerformance {
  validatorIndex: number;
  epoch: number;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  blockProposalStatus: BlockProposalStatus;
  attestationsTotalRewards: AttestationsTotalRewards;
  slot?: number;
  liveness?: boolean;
  syncCommitteeRewards?: number;
  error?: string;
}

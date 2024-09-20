import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";

export enum BlockProposalStatus {
  Missed = "Missed",
  Proposed = "Proposed",
  Unchosen = "Unchosen",
  Error = "Error"
}

export interface ValidatorPerformance {
  validatorIndex: number;
  epoch: number;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  slot?: number;
  liveness?: boolean;
  blockProposalStatus?: BlockProposalStatus;
  syncCommitteeRewards?: number;
  attestationsRewards?: object;
  error?: string;
}

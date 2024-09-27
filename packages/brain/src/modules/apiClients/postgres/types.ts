import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";

export enum BlockProposalStatus {
  Missed = "Missed",
  Proposed = "Proposed",
  Unchosen = "Unchosen",
  Error = "Error"
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
  blockProposalStatus?: BlockProposalStatus;
  attestationsTotalRewards?: AttestationsTotalRewards;
  slot?: number;
  liveness?: boolean;
  syncCommitteeRewards?: number;
  error?: ValidatorPerformanceError;
}

export enum ValidatorPerformanceErrorCode {
  BEACONCHAIN_API_ERROR = "BEACONCHAIN_API_ERROR",
  EXECUTION_OFFLINE = "EXECUTION_OFFLINE",
  CONSENSUS_SYNCING = "CONSENSUS_SYNCING",
  BRAINDDB_ERROR = "BRAINDDB_ERROR",
  MISSING_BLOCK_DATA = "MISSING_BLOCK_DATA",
  MISSING_ATT_DATA = "MISSING_ATT_DATA",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export interface ValidatorPerformanceError {
  code: ValidatorPerformanceErrorCode;
  message: string;
}

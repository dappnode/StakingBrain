import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { IdealRewards, TotalRewards } from "../beaconchain/types.js";

export enum Columns {
  validatorIndex = "validator_index",
  epoch = "epoch",
  executionClient = "execution_client",
  consensusClient = "consensus_client",
  slot = "slot",
  liveness = "liveness",
  blockProposalStatus = "block_proposal_status",
  syncCommitteeRewards = "sync_comittee_rewards",
  attestationsTotalRewards = "attestations_total_rewards",
  attestationsIdealRewards = "attestations_ideal_rewards",
  error = "error"
}

// Interface data write with Postgres client
export interface ValidatorPerformancePostgres {
  [Columns.validatorIndex]: number;
  [Columns.epoch]: number;
  [Columns.executionClient]: ExecutionClient;
  [Columns.consensusClient]: ConsensusClient;
  [Columns.slot]: number;
  [Columns.liveness]: boolean;
  [Columns.blockProposalStatus]: BlockProposalStatus;
  [Columns.syncCommitteeRewards]: number;
  [Columns.attestationsTotalRewards]: string;
  [Columns.attestationsIdealRewards]: string;
  [Columns.error]: string;
}

export enum BlockProposalStatus {
  Missed = "Missed",
  Proposed = "Proposed",
  Unchosen = "Unchosen",
  Error = "Error"
}

// Interface data return from Postgres client
export interface ValidatorPerformance {
  validatorIndex: number;
  epoch: number;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  blockProposalStatus?: BlockProposalStatus;
  attestationsTotalRewards?: TotalRewards;
  attestationsIdealRewards?: IdealRewards;
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

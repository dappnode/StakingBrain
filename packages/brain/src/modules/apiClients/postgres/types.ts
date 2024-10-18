import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { IdealRewards, TotalRewards } from "../beaconchain/types.js";

// The postgres DB columns may not be camel case sensitive
export enum Columns {
  validatorindex = "validatorindex",
  epoch = "epoch",
  clients = "clients",
  attestation = "attestation",
  block = "block",
  synccommittee = "synccommittee",
  slot = "slot",
  error = "error"
}

export interface EpochsValidatorsData {
  [epoch: number]: {
    [validatorIndex: number]: DataPerEpoch;
  };
}

// Indexed by validator index
export type ValidatorsDataPerEpochMap = Map<number, DataPerEpoch>;

export interface DataPerEpoch {
  [Columns.clients]: Clients;
  [Columns.attestation]?: Attestation;
  [Columns.block]?: Block;
  [Columns.synccommittee]?: SyncCommittee;
  [Columns.slot]?: number;
  [Columns.error]?: EpochError;
}

// Postgres library returns data in string format even if the column was set with BIGINT
export interface PostgresDataRow extends DataPerEpoch {
  [Columns.validatorindex]: string;
  [Columns.epoch]: string;
}

export interface SyncCommittee {
  reward: number;
}

export interface Clients {
  execution: ExecutionClient;
  consensus: ConsensusClient;
}

export interface Attestation {
  totalRewards: TotalRewards;
  idealRewards: IdealRewards;
}

export interface Block {
  status: BlockProposalStatus;
  slot?: number;
  graffiti?: string;
  reward?: number;
}

export enum BlockProposalStatus {
  Missed = "Missed",
  Proposed = "Proposed",
  Unchosen = "Unchosen",
  Error = "Error"
}

export enum EpochErrorCode {
  BEACONCHAIN_API_ERROR = "BEACONCHAIN_API_ERROR",
  EXECUTION_OFFLINE = "EXECUTION_OFFLINE",
  CONSENSUS_SYNCING = "CONSENSUS_SYNCING",
  BRAINDDB_ERROR = "BRAINDDB_ERROR",
  MISSING_BLOCK_DATA = "MISSING_BLOCK_DATA",
  MISSING_ATT_DATA = "MISSING_ATT_DATA",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export interface EpochError {
  code: EpochErrorCode;
  message: string;
}

import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { IdealRewards, TotalRewards } from "../beaconchain/types.js";

export enum Columns {
  validatorIndex = "validatorIndex",
  epoch = "epoch",
  clients = "clients",
  attestation = "attestation",
  block = "block",
  syncCommittee = "syncCommittee",
  slot = "slot",
  error = "error"
}

// Indexed by epoch number
export type EpochsValidatorsMap = Map<number, ValidatorsDataPerEpochMap>;

// Indexed by validator index
export type ValidatorsDataPerEpochMap = Map<string, DataPerEpoch>;

export interface DataPerEpoch {
  [Columns.clients]: Clients;
  [Columns.attestation]?: Attestation;
  [Columns.block]?: Block;
  [Columns.syncCommittee]?: SyncCommittee;
  [Columns.slot]?: number;
  [Columns.error]?: EpochError;
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

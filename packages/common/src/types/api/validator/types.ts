import { BeaconchainPoolVoluntaryExitsPostRequest } from "../beaconchain/types.js";

export interface ValidatorGetFeeResponse {
  data: {
    pubkey: string;
    ethaddress: string;
  };
}

export interface ValidatorPostFeeRequest {
  ethaddress: string;
}
export interface ValidatorPostRemoteKeysRequest {
  remote_keys: {
    pubkey: string;
    url: string;
  }[];
}

export interface ValidatorPostRemoteKeysResponse {
  data: {
    status: string;
    message: string;
  }[];
}
export interface ValidatorGetRemoteKeysResponse {
  data: {
    pubkey: string;
    url: string;
    readonly: boolean;
  }[];
}
export interface ValidatorDeleteRemoteKeysRequest {
  pubkeys: string[];
}

export interface ValidatorDeleteRemoteKeysResponse {
  data: {
    status: string;
    message: string;
  }[];
}

export interface ValidatorAttesterDutiesPostResponse {
  dependent_root: string;
  execution_optimistic: boolean;
  data: {
    pubkey: string;
    validator_index: string;
    committee_index: string;
    committee_length: string;
    committees_at_slot: string;
    validator_committee_index: string;
    slot: string;
  }[];
}

export interface ValidatorProposerDutiesGetResponse {
  dependent_root: string;
  execution_optimistic: false;
  data: {
    pubkey: string;
    validator_index: string;
    slot: string;
  }[];
}

export interface ValidatorLivenessPostResponse {
  data: {
    index: string;
    is_live: boolean;
  }[];
}

export interface ValidatorExitGet extends BeaconchainPoolVoluntaryExitsPostRequest {
  pubkey: string;
}

export interface ValidatorExitExecute {
  pubkey: string;
  status: {
    exited: boolean;
    message?: string;
  };
}

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

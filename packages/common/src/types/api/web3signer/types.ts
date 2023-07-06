export type Web3SignerStatus = "UP" | "DOWN" | "UNKNOWN" | "LOADING" | "ERROR";

export interface Web3signerGetResponse {
  data: {
    validating_pubkey: string;
    derivation_path: string;
    readonly: boolean;
  }[];
}
export interface Web3signerPostRequest {
  keystores: string[];
  passwords: string[];
  slashing_protection?: string;
}
export interface Web3signerPostResponse {
  data: {
    status: string;
    message: string;
  }[];
}
export interface Web3signerDeleteRequest {
  pubkeys: string[];
}
export interface Web3signerDeleteResponse {
  data: {
    status: string;
    message: string;
  }[];
  slashing_protection?: string;
}
export interface Web3signerHealthcheckResponse {
  status: Web3SignerStatus;
  checks: {
    id: string;
    status: string;
  }[];
  outcome: string;
}

export interface Web3SignerPostSignvoluntaryexitRequest {
  type: "VOLUNTARY_EXIT";
  fork_info: {
    fork: {
      previous_version: string;
      current_version: string;
      epoch: string;
    };
    genesis_validators_root: string;
  };
  signingRoot?: string;
  voluntary_exit: {
    epoch: string;
    validator_index: string;
  };
}

export interface Web3SignerPostSignvoluntaryexitResponse {
  signature: string;
}
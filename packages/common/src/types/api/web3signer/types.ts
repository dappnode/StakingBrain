export type Web3SignerStatus = "UP" | "DOWN" | "UNKNOWN" | "LOADING" | "ERROR";

export interface Web3signerGetResponse {
  data: {
    validating_pubkey: string;
    derivation_path: string;
    readonly: boolean;
  }[];
}

export interface Web3signerPostRequest {
  keystores: File[];
  passwords: string[];
  slashingProtection: File | undefined;
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

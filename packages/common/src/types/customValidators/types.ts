import { Tag } from "../index.js";

export type ActionRequestOrigin = "ui" | "api";

export interface CustomImportRequest {
  validatorsImportRequest: CustomValidatorImportRequest[];
  importFrom: ActionRequestOrigin;
  slashing_protection?: File | string;
}
export interface CustomValidatorImportRequest {
  tag: Tag;
  feeRecipient: string;
  keystore: File | string;
  password: string;
}

export interface CustomValidatorUpdateRequest {
  pubkey: string;
  feeRecipient: string;
}

export type WithdrawalCredentialsFormat = "ecdsa" | "bls" | "unknown" | "error";
export interface CustomValidatorGetResponse {
  pubkey: string;
  index: string;
  tag: Tag;
  feeRecipient: string;
  withdrawalCredentials: {
    format: WithdrawalCredentialsFormat;
    address: string;
  };
  signerImported?: boolean;
  validatorImported?: boolean;
  validatorFeeRecipientCorrect?: boolean;
}

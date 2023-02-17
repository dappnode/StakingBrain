import { Tag } from "../index.js";

export interface CustomImportRequest {
  validatorsImportRequest: CustomValidatorImportRequest[];
  importFrom: "ui" | "api";
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
export interface CustomValidatorGetResponse {
  pubkey: string;
  tag: Tag;
  feeRecipient: string;
  signerImported?: boolean;
  validatorImported?: boolean;
  validatorFeeRecipientCorrect?: boolean;
}

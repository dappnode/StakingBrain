import { Tag } from "../index.js";

export interface CustomValidatorsImportRequest {
  importFrom: "ui" | "api";
  tags: Tag[];
  feeRecipients: string[];
  keystores: File[] | string[];
  passwords: string[];
  slashing_protection?: File | string;
}
export interface CustomValidatorGetResponse {
  validating_pubkey: string;
  tag?: Tag;
  feeRecipient?: string;
}

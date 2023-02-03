import { Tag, Web3signerPostRequestFromUi } from "../index.js";

export interface CustomValidatorsImportRequest
  extends Web3signerPostRequestFromUi {
  tags: Tag[];
  feeRecipients: string[];
}

export interface CustomValidatorGetResponse {
  validating_pubkey: string;
  tag?: Tag;
  feeRecipient?: string;
}

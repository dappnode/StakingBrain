import { Web3signerPostRequest } from "../../apiClients/types.js";

export interface BrainKeystoreImportRequest extends Web3signerPostRequest {
  tags: string[];
  feeRecipients: string[];
}

export interface BrainPubkeysFeeRecipients {
  validators: {
    pubkey: string;
    feeRecipient: string;
  }[];
}

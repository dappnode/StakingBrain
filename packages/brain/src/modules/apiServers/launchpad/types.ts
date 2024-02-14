import { Web3signerPostRequest } from "@stakingbrain/common";

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
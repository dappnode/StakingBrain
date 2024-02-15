import { tags as availableTags, isValidBlsPubkey, isValidEcdsaPubkey, Tag, Web3signerDeleteRequest } from "@stakingbrain/common";
import { BrainKeystoreImportRequest, BrainPubkeysFeeRecipients } from "../types.js";

export function validateImportKeystoresRequestBody(request: BrainKeystoreImportRequest): void {
    // Check if the request contains keystores
    if (!request.keystores || !Array.isArray(request.keystores) || request.keystores.length === 0) {
        throw new Error("Keystores array is required and must not be empty.");
    }

    // Check if the request contains passwords
    if (!request.passwords || !Array.isArray(request.passwords) || request.passwords.length === 0) {
        throw new Error("Passwords array is required and must not be empty.");
    }

    // Check if the request contains tags
    if (!request.tags || !Array.isArray(request.tags) || request.tags.length === 0) {
        throw new Error("Tags array is required and must not be empty.");
    }

    // Check if the request contains fee recipients
    if (!request.feeRecipients || !Array.isArray(request.feeRecipients) || request.feeRecipients.length === 0) {
        throw new Error("Fee recipients array is required and must not be empty.");
    }

    // Check if the lengths of all arrays are consistent
    const { keystores, passwords, tags, feeRecipients } = request;
    const arrays = [keystores, passwords, tags, feeRecipients];
    if (arrays.some(arr => arr.length !== keystores.length)) {
        throw new Error("All arrays (keystores, passwords, tags, fee recipients) must have the same length.");
    }
}

export function validateDeleteRequestBody(deleteReq: Web3signerDeleteRequest): void {
    const { pubkeys } = deleteReq;

    if (!pubkeys) {
        throw new Error("pubkeys parameter is required.");
    } else if (!Array.isArray(pubkeys)) {
        throw new Error("pubkeys must be an array of strings.");
    } else {
        const invalidPubkeys = pubkeys.filter(pubkey => !isValidBlsPubkey(pubkey));
        if (invalidPubkeys.length > 0) {
            throw new Error(`Invalid pubkey format: ${invalidPubkeys.join(", ")}. Pubkeys should follow BLS format (beginning with 0x)`);
        }
    }
}

export function validatePubkeysQueryParam(pubkeys: string | string[] | undefined): void {
    if (!pubkeys) return;

    const pubkeyArray = Array.isArray(pubkeys) ? pubkeys : pubkeys.split(',');
    const invalidPubkeys = pubkeyArray.filter(pubkey => !isValidBlsPubkey(pubkey));

    if (invalidPubkeys.length > 0)
        throw new Error(`Invalid pubkey format: ${invalidPubkeys.join(", ")}. Pubkeys should follow BLS format (beginning with 0x)`);
}

export function validateUpdateFeeRecipientRequestBody(requestBody: BrainPubkeysFeeRecipients): void {
    if (!requestBody || !Array.isArray(requestBody.validators)) {
        throw new Error("The request body must contain a 'validators' array.");
    }

    const { validators } = requestBody;
    validators.forEach((validator, index) => {
        if (typeof validator.pubkey !== 'string' || !isValidBlsPubkey(validator.pubkey)) {
            throw new Error(`Validator at index ${index} is missing a valid or has an invalid BLS public key: ${validator.pubkey}.`);
        }

        if (typeof validator.feeRecipient !== 'string' || !isValidEcdsaPubkey(validator.feeRecipient)) {
            throw new Error(`Validator at index ${index} is missing a valid or has an invalid Ethereum address: ${validator.feeRecipient}.`);
        }
    });
}
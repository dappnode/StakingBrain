import { tags as availableTags, isValidBlsPubkey, Tag, Web3signerDeleteRequest } from "@stakingbrain/common";
import { BrainKeystoreImportRequest } from "../types.js";

export function validateImportKeystoresRequestBody(
    { keystores, passwords, tags, feeRecipients }: BrainKeystoreImportRequest
): string[] {
    const errors: string[] = [];

    if (!keystores || !Array.isArray(keystores) || keystores.some(keystore => typeof keystore !== 'string')) {
        errors.push("keystores must be an array of strings.");
    }
    if (!passwords || !Array.isArray(passwords) || passwords.some(password => typeof password !== 'string')) {
        errors.push("passwords must be an array of strings.");
    }
    if (!tags || !Array.isArray(tags) || tags.some(tag => !availableTags.includes(tag as Tag))) {
        errors.push(`tags must be one of the following: ${availableTags.join(", ")}.`);
    }
    if (!feeRecipients || !Array.isArray(feeRecipients) || feeRecipients.some(feeRecipient => typeof feeRecipient !== 'string')) {
        errors.push("feeRecipients must be an array of strings.");
    }

    // Check for matching array lengths
    const lengths = [keystores.length, passwords.length, tags.length, feeRecipients.length];
    if (new Set(lengths).size !== 1) {
        errors.push("keystores, passwords, tags, and feeRecipients must have the same length.");
    }

    return errors;
}

export function validateDeleteRequestBody(deleteReq: Web3signerDeleteRequest): string[] {
    const errors: string[] = [];
    const { pubkeys } = deleteReq;

    if (!pubkeys) {
        errors.push("pubkeys parameter is required.");
    } else if (!Array.isArray(pubkeys)) {
        errors.push("pubkeys must be an array of strings.");
    } else {
        const hexPattern = /^0x[a-fA-F0-9]{96}$/;
        pubkeys.forEach(pubkey => {
            if (!hexPattern.test(pubkey)) {
                errors.push(`Invalid pubkey format: ${pubkey}. Expected format is 0x followed by 96 hexadecimal characters.`);
            }
        });
    }

    return errors;
}

export function validatePubkeysQueryParam(pubkeys: string | string[] | undefined): string[] | null {
    if (!pubkeys) {
        return null; // No pubkeys provided
    }

    const pubkeyArray = Array.isArray(pubkeys) ? pubkeys : pubkeys.split(',');
    const invalidPubkeys = pubkeyArray.filter(pubkey => !isValidBlsPubkey(pubkey));

    return invalidPubkeys.length > 0 ? invalidPubkeys : null;
}
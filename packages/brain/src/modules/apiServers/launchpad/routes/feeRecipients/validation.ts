import { isValidBlsPubkey, isValidEcdsaPubkey } from "@stakingbrain/common";
import { BrainPubkeysFeeRecipients } from "../../types.js";

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
import express from "express";
import { getValidators } from "../../../../calls/getValidators.js";
import { CustomValidatorGetResponse, isValidBlsPubkey } from "@stakingbrain/common";
import { BrainPubkeysFeeRecipients } from "../types.js";

const feeRecipientsRouter = express.Router();

const feeRecipientsEndpoint = "/eth/v1/feeRecipients";

/**
 * Retrieves fee recipient information for specified validators via GET request.
 * Clients can filter validators by providing a list of BLS public keys (pubkeys) as
 * a query parameter. If no pubkeys are provided, information for all validators is returned.
 * Only valid BLS public keys are considered for filtering.
 *
 * Example usage:
 * GET /api/feeRecipients?pubkeys=0x12345,0x67890
 * 
 * This request returns fee recipient details for validators with public keys 0x12345 and 0x67890.
 *
 * Example response:
 * {
 *   "validators": [
 *     {
 *       "pubkey": "0x12345",
 *       "feeRecipient": "0xabcdef"
 *     },
 *     {
 *       "pubkey": "0x67890",
 *       "feeRecipient": "0x123456"
 *     }
 *   ]
 * }
 */
feeRecipientsRouter.get(feeRecipientsEndpoint, async (req, res) => {
    try {
        const validators: CustomValidatorGetResponse[] = await getValidators();

        const pubkeysParam = req.query.pubkeys as string | undefined;
        let filteredValidators = validators;

        if (pubkeysParam) {
            const pubkeys = pubkeysParam.split(',');
            const validPubkeys = pubkeys.filter(pubkey => isValidBlsPubkey(pubkey));
            filteredValidators = validators.filter(validator => validPubkeys.includes(validator.pubkey));
        }

        const response: BrainPubkeysFeeRecipients = {
            validators: filteredValidators.map(validator => ({
                pubkey: validator.pubkey,
                feeRecipient: validator.feeRecipient
            }))
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Failed to retrieve validators:', error);
        res.status(500).send({ message: "Internal server error" });
    }
});


feeRecipientsRouter.post(feeRecipientsEndpoint, async (req, res) => {
    // TODO: Implement this endpoint
    res.status(405).send({ message: "Method not allowed" });
});

export default feeRecipientsRouter;

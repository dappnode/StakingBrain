import express from "express";
import { getValidators } from "../../../../calls/getValidators.js";
import { CustomValidatorGetResponse, isValidBlsPubkey } from "@stakingbrain/common";
import { BrainPubkeysFeeRecipients } from "../types.js";
import { validateUpdateFeeRecipientRequestBody } from "../validation/requestValidation.js";
import { updateValidators } from "../../../../calls/updateValidators.js";

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

        return res.status(200).json(response);
    } catch (error) {
        console.error('Failed to retrieve validators:', error);
        return res.status(500).send({ message: "Internal server error" });
    }
});

/**
 * Updates the fee recipient addresses for a list of specified validators. Only validators
 * whose public keys are provided in the request will have their fee recipient addresses updated.
 *
 * Example request body:
 * POST /eth/v1/feeRecipients
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
 *
 * A successful update returns a 200 status code with no body. Errors in the request format or
 * validation process result in a 400 Bad Request response detailing the issues found.
 */
feeRecipientsRouter.post(feeRecipientsEndpoint, async (req, res) => {
    try {
        const requestBody: BrainPubkeysFeeRecipients = req.body;

        const errors = validateUpdateFeeRecipientRequestBody(requestBody);
        if (errors.length > 0) {
            res.status(400).send({ message: `Bad request: ${errors.join("\n")}` });
            return;
        }

        const currentValidators: CustomValidatorGetResponse[] = await getValidators();

        const validatorsToUpdate = currentValidators.filter(validator =>
            requestBody.validators.some(reqValidator =>
                reqValidator.pubkey.toLowerCase() === validator.pubkey.toLowerCase()
            )
        );

        validatorsToUpdate.forEach(validator => {
            const matchingValidator = requestBody.validators.find(reqValidator =>
                reqValidator.pubkey.toLowerCase() === validator.pubkey.toLowerCase()
            );
            if (matchingValidator) {
                validator.feeRecipient = matchingValidator.feeRecipient;
            }
        });

        await updateValidators(validatorsToUpdate);

        return res.status(200).send();
    } catch (error) {
        console.error('Failed to update validators:', error);
        return res.status(500).send({ message: "Internal server error" });
    }
});

export default feeRecipientsRouter;

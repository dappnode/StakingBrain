import express from "express";
import { isValidBlsPubkey } from "@stakingbrain/common";
import { updateValidators } from "../../../ui/calls/updateValidators.js";
import { getValidators } from "../../../ui/calls/getValidators.js";
import { BrainPubkeysFeeRecipients } from "../../types.js";
import { validateUpdateFeeRecipientRequestBody } from "./validation.js";
import type { CustomValidatorGetResponse } from "../../../ui/calls/types.js";
import logger from "../../../../logger/index.js";
import { Web3SignerApi, ValidatorApi, BeaconchainApi } from "../../../../apiClients/index.js";
import { BrainDataBase } from "../../../../db/index.js";
import { CronJob } from "../../../../cron/cron.js";

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

export const createFeeRecipientsRouter = ({
  brainDb,
  signerApi,
  validatorApi,
  beaconchainApi,
  reloadValidatorsCron
}: {
  brainDb: BrainDataBase;
  signerApi: Web3SignerApi;
  validatorApi: ValidatorApi;
  beaconchainApi: BeaconchainApi;
  reloadValidatorsCron: CronJob;
}) => {
  const feeRecipientsRouter = express.Router();
  const feeRecipientsEndpoint = "/eth/v1/feeRecipients";

  feeRecipientsRouter.get(feeRecipientsEndpoint, async (req, res) => {
    try {
      const validators: CustomValidatorGetResponse[] = await getValidators({
        brainDb,
        signerApi,
        validatorApi,
        beaconchainApi
      });
      const pubkeysParam = req.query.pubkeys as string | undefined;

      if (!pubkeysParam) {
        // If no pubkeys are provided, return information for all validators
        const response: BrainPubkeysFeeRecipients = {
          validators: validators.map((validator) => ({
            pubkey: validator.pubkey,
            feeRecipient: validator.feeRecipient
          }))
        };

        res.status(200).json(response);
        return;
      }

      const pubkeys = pubkeysParam.split(",").map((pubkey) => pubkey.toLowerCase());
      const invalidPubkeys = pubkeys.filter((pubkey) => !isValidBlsPubkey(pubkey));

      if (invalidPubkeys.length > 0) {
        res.status(400).send({
          message: `Invalid pubkey format: ${invalidPubkeys.join(", ")}. Pubkeys should follow BLS format (beginning with 0x)`
        });
        return;
      }

      const filteredValidators = validators.filter((validator) => pubkeys.includes(validator.pubkey.toLowerCase()));

      if (filteredValidators.length === 0) {
        res.status(404).send({ message: "No validators found for the provided pubkeys" });
        return;
      }

      const response: BrainPubkeysFeeRecipients = {
        validators: filteredValidators.map((validator) => ({
          pubkey: validator.pubkey,
          feeRecipient: validator.feeRecipient
        }))
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to retrieve validators:", error);
      res.status(500).send({ message: "Internal server error" });
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
    const requestBody: BrainPubkeysFeeRecipients = req.body;

    try {
      validateUpdateFeeRecipientRequestBody(requestBody);
    } catch (e) {
      res.status(400).send({ message: `Bad request: ${e}` });
      return;
    }

    try {
      const currentValidators: CustomValidatorGetResponse[] = await getValidators({
        brainDb,
        signerApi,
        validatorApi,
        beaconchainApi
      });

      const validatorsToUpdate = currentValidators.filter((validator) =>
        requestBody.validators.some(
          (reqValidator) => reqValidator.pubkey.toLowerCase() === validator.pubkey.toLowerCase()
        )
      );

      validatorsToUpdate.forEach((validator) => {
        const matchingValidator = requestBody.validators.find(
          (reqValidator) => reqValidator.pubkey.toLowerCase() === validator.pubkey.toLowerCase()
        );
        if (matchingValidator) {
          validator.feeRecipient = matchingValidator.feeRecipient;
        }
      });

      await updateValidators({
        reloadValidatorsCron,
        brainDb,
        validatorApi,
        customValidatorUpdateRequest: validatorsToUpdate,
        requestFrom: "api"
      });

      res.status(200).send();
    } catch (error) {
      logger.error("Failed to update validators:", error);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  return feeRecipientsRouter;
};

import {
  CustomValidatorUpdateRequest,
  prefix0xPubkey,
  isFeeRecipientEditable,
  PubkeyDetails,
} from "@stakingbrain/common";
import { cron, brainDb, validatorApi } from "../index.js";
import logger from "../modules/logger/index.js";

/**
 * Updates validators on DB:
 * 1. Write on db MUST goes first because if signerApi fails, cron will try to delete them
 * 2. Import feeRecipient on Validator API
 * @param param0
 */
export async function updateValidators(
  customValidatorUpdateRequest: CustomValidatorUpdateRequest[]
): Promise<void> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are importing validators
    cron.stop();

    const dbData = brainDb.getData();

    // Only update validators with editable fee recipient
    const editableValidators: CustomValidatorUpdateRequest[] =
      customValidatorUpdateRequest.filter(
        (validator) =>
          dbData[prefix0xPubkey(validator.pubkey)] &&
          isFeeRecipientEditable(dbData[prefix0xPubkey(validator.pubkey)].tag)
      );

    if (editableValidators.length === 0) {
      throw new Error(
        "The fee recipient can't be updated for these validators"
      );
    }

    brainDb.updateValidators({
      validators: editableValidators.reduce((acc, validator) => {
        acc[validator.pubkey] = {
          feeRecipient: validator.feeRecipient,
        };
        return acc;
      }, {} as { [pubkey: string]: Omit<PubkeyDetails, "automaticImport" | "tag"> }),
    });

    // Import feeRecipient on Validator API
    for (const validator of editableValidators)
      await validatorApi
        .setFeeRecipient(validator.feeRecipient, validator.pubkey)
        .then(() => logger.debug(`Added feeRecipient to validator API`))
        .catch((err) =>
          logger.error(`Error setting validator feeRecipient`, err)
        );

    // IMPORTANT: start the cron
    cron.start();
  } catch (e) {
    cron.restart();
    throw e;
  }
}

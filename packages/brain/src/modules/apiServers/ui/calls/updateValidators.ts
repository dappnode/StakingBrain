import { withValidatorOperationLock } from "../../../db/withValidatorOperationLock.js";
import { prefix0xPubkey, isFeeRecipientEditable, ActionRequestOrigin } from "@stakingbrain/common";
import logger from "../../../../modules/logger/index.js";
import { CustomValidatorUpdateRequest } from "./types.js";
import { StakingBrainDbUpdate } from "../../../../modules/db/types.js";
import { CronJob } from "../../../cron/cron.js";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi } from "../../../apiClients/validator/index.js";
import { applyValidatorBuilderConfig } from "../../../cron/reloadValidators/postValidatorsBuilderConfigsFromDb.js";

/** Persist desired settings first. Periodic reload retries client failures. */
export async function updateValidators({
  reloadValidatorsCronTask,
  brainDb,
  validatorApi,
  customValidatorUpdateRequest,
  requestFrom
}: {
  reloadValidatorsCronTask: CronJob;
  brainDb: BrainDataBase;
  validatorApi: ValidatorApi;
  customValidatorUpdateRequest: CustomValidatorUpdateRequest[];
  requestFrom?: ActionRequestOrigin;
}): Promise<void> {
  return withValidatorOperationLock(brainDb, async () => {
    reloadValidatorsCronTask.stop();
    try {
      if (!Array.isArray(customValidatorUpdateRequest) || customValidatorUpdateRequest.length === 0)
        throw new Error("Select at least one validator to update");
      const dbData = brainDb.getData();
      const updates: StakingBrainDbUpdate = {};
      for (const validator of customValidatorUpdateRequest) {
        if (!validator || typeof validator.pubkey !== "string") throw new Error("Validator public key is required");
        const pubkey = prefix0xPubkey(validator.pubkey);
        if (!dbData[pubkey]) throw new Error(`Validator ${pubkey} is not in the database`);
        if (updates[pubkey]) throw new Error(`Duplicate validator ${pubkey}`);
        if (Object.keys(validator).some((field) => !["pubkey", "feeRecipient", "builderConfig"].includes(field)))
          throw new Error("Unsupported validator setting");
        const update: StakingBrainDbUpdate[string] = {};
        if ("feeRecipient" in validator && isFeeRecipientEditable(dbData[pubkey].tag, requestFrom))
          update.feeRecipient = validator.feeRecipient;
        if ("builderConfig" in validator) update.builderConfig = validator.builderConfig;
        if (Object.keys(update).length > 0) updates[pubkey] = update;
      }
      if (Object.keys(updates).length === 0) throw new Error("The fee recipient can't be updated for these validators");

      // Validate the entire batch before changing any persisted settings.
      brainDb.updateValidators({ validators: updates });
      const failures: string[] = [];
      for (const [pubkey, update] of Object.entries(updates)) {
        if (update.feeRecipient !== undefined)
          await validatorApi.setFeeRecipient(update.feeRecipient, pubkey).catch((err) => {
            logger.error("Error setting validator feeRecipient", err);
            failures.push(`Fee recipient application failed for ${pubkey}`);
          });
        if ("builderConfig" in update) {
          try {
            await applyValidatorBuilderConfig(validatorApi, pubkey, update.builderConfig);
          } catch (error) {
            logger.error(error);
            failures.push(error.message);
          }
        }
      }
      if (failures.length > 0)
        throw new Error(
          `Settings saved; client configuration application failed and will be retried on reload. ${failures.join("; ")}`
        );
    } finally {
      reloadValidatorsCronTask.start();
    }
  });
}

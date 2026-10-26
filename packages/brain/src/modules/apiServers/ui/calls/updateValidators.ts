import { prefix0xPubkey, isFeeRecipientEditable, ActionRequestOrigin } from "@stakingbrain/common";
import { withValidatorOperationLock } from "../../../db/withValidatorOperationLock.js";
import logger from "../../../logger/index.js";
import { CustomValidatorUpdateRequest } from "./types.js";
import { StakingBrainDb } from "../../../db/types.js";
import { CronJob } from "../../../cron/cron.js";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi } from "../../../apiClients/validator/index.js";
import { applyValidatorBuilderConfig } from "../../../cron/reloadValidators/postValidatorsBuilderConfigsFromDb.js";

type UpdateValidatorsOptions = {
  reloadValidatorsCronTask: CronJob;
  brainDb: BrainDataBase;
  validatorApi: ValidatorApi;
  signerUrl: string;
  customValidatorUpdateRequest: CustomValidatorUpdateRequest[];
  requestFrom?: ActionRequestOrigin;
};

/** Persist desired settings first. Periodic reload retries client failures. */
export async function updateValidators({
  reloadValidatorsCronTask,
  brainDb,
  validatorApi,
  signerUrl,
  customValidatorUpdateRequest: requests,
  requestFrom
}: UpdateValidatorsOptions): Promise<void> {
  return withValidatorOperationLock(brainDb, async () => {
    reloadValidatorsCronTask.stop();
    try {
      const currentValidators = brainDb.getData();
      const updates = prepareUpdates(requests, currentValidators, requestFrom);

      // The database validates the entire batch before persisting any settings.
      brainDb.updateValidators(updates);
      const importedKeys = await importMissingBuilderKeys(validatorApi, signerUrl, updates);
      await applyUpdates(validatorApi, updates, currentValidators, importedKeys);
    } finally {
      reloadValidatorsCronTask.start();
    }
  });
}

function prepareUpdates(
  requests: CustomValidatorUpdateRequest[],
  currentValidators: StakingBrainDb,
  requestFrom?: ActionRequestOrigin
): CustomValidatorUpdateRequest[] {
  if (!Array.isArray(requests) || requests.length === 0) throw new Error("Select at least one validator to update");

  const updates: CustomValidatorUpdateRequest[] = [];
  const seen = new Set<string>();
  for (const request of requests) {
    if (!request || typeof request.pubkey !== "string") throw new Error("Validator public key is required");
    const pubkey = prefix0xPubkey(request.pubkey);
    const current = currentValidators[pubkey];
    if (!current) throw new Error(`Validator ${pubkey} is not in the database`);
    if (seen.has(pubkey)) throw new Error(`Duplicate validator ${pubkey}`);
    if (Object.keys(request).some((field) => !["pubkey", "feeRecipient", "builderConfig"].includes(field)))
      throw new Error("Unsupported validator setting");

    const { feeRecipient, builderConfig } = request;
    const update: CustomValidatorUpdateRequest = { pubkey };
    if (feeRecipient !== undefined && isFeeRecipientEditable(current.tag, requestFrom))
      update.feeRecipient = feeRecipient;
    if (builderConfig !== undefined) update.builderConfig = builderConfig;
    if (update.feeRecipient !== undefined || update.builderConfig !== undefined) {
      updates.push(update);
      seen.add(pubkey);
    }
  }

  if (updates.length === 0) throw new Error("The fee recipient can't be updated for these validators");
  return updates;
}

/** A restart may have cleared keys before the next cron reload. */
async function importMissingBuilderKeys(
  validatorApi: ValidatorApi,
  signerUrl: string,
  updates: readonly CustomValidatorUpdateRequest[]
): Promise<Set<string>> {
  const builderPubkeys = updates.filter(({ builderConfig }) => builderConfig !== undefined).map(({ pubkey }) => pubkey);
  if (builderPubkeys.length === 0) return new Set();

  const remoteKeys = await validatorApi.getRemoteKeys();
  const loaded = new Set(remoteKeys.data.map(({ pubkey }) => pubkey.toLowerCase()));
  const missing = builderPubkeys.filter((pubkey) => !loaded.has(pubkey.toLowerCase()));
  if (missing.length > 0)
    await validatorApi.postRemoteKeys({ remote_keys: missing.map((pubkey) => ({ pubkey, url: signerUrl })) });
  return new Set(missing);
}

async function applyUpdates(
  validatorApi: ValidatorApi,
  updates: readonly CustomValidatorUpdateRequest[],
  currentValidators: StakingBrainDb,
  importedKeys: Set<string>
): Promise<void> {
  const failures: string[] = [];
  for (const update of updates) {
    const { pubkey } = update;
    let feeRecipient = update.feeRecipient;
    if (feeRecipient === undefined && importedKeys.has(pubkey)) feeRecipient = currentValidators[pubkey].feeRecipient;

    if (feeRecipient !== undefined) {
      try {
        await validatorApi.setFeeRecipient(feeRecipient, pubkey);
      } catch (error) {
        logger.error("Error setting validator feeRecipient", error);
        failures.push(`Fee recipient application failed for ${pubkey}`);
      }
    }
    if (update.builderConfig !== undefined) {
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
}

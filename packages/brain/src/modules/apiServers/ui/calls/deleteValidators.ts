import { ValidatorApi, Web3SignerApi } from "../../../apiClients/index.js";
import { Web3signerDeleteRequest, Web3signerDeleteResponse } from "../../../apiClients/types.js";
import { CronJob } from "../../../cron/cron.js";
import { BrainDataBase } from "../../../db/index.js";
import logger from "../../../logger/index.js";

/**
 * Delete keystores:
 * 1. Write on db
 * 2. Delete keystores on web3signer API
 * 3. Delete pubkeys on validator API
 * 4. Delete feeRecipient on Validator API
 * @param deleteRequest
 * @returns
 */
export async function deleteValidators({
  reloadValidatorsCron,
  validatorApi,
  signerApi,
  brainDb,
  deleteRequest
}: {
  reloadValidatorsCron: CronJob;
  validatorApi: ValidatorApi;
  signerApi: Web3SignerApi;
  brainDb: BrainDataBase;
  deleteRequest: Web3signerDeleteRequest;
}): Promise<Web3signerDeleteResponse> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are deleting validators
    reloadValidatorsCron.stop();

    // Delete feeRecipient on Validator API
    for (const pubkey of deleteRequest.pubkeys)
      await validatorApi
        .deleteFeeRecipient(pubkey)
        .then(() => logger.debug(`Deleted fee recipient in validator API`))
        .catch((err) => logger.error(`Error deleting validator feeRecipient`, err));
    // Delete pubkeys on validator API
    await validatorApi
      .deleteRemoteKeys(deleteRequest)
      .then(() => logger.debug(`Deleted pubkeys in validator API`))
      .catch((err) => logger.error(`Error deleting validator pubkeys`, err));

    // Delete keystores on web3signer API
    const web3signerDeleteResponse = await signerApi.deleteRemoteKeys(deleteRequest);

    // Write on db
    brainDb.deleteValidators(deleteRequest.pubkeys);

    // IMPORTANT: start the cron
    reloadValidatorsCron.start();
    return web3signerDeleteResponse;
  } catch (e) {
    reloadValidatorsCron.restart();
    throw e;
  }
}

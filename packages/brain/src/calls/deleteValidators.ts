import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
} from "@stakingbrain/common";
import { cron, validatorApi, signerApi, brainDb } from "../index.js";
import logger from "../modules/logger/index.js";

/**
 * Delete keystores:
 * 1. Write on db
 * 2. Delete keystores on web3signer API
 * 3. Delete pubkeys on validator API
 * 4. Delete feeRecipient on Validator API
 * @param deleteRequest
 * @returns
 */
export async function deleteValidators(
  deleteRequest: Web3signerDeleteRequest
): Promise<Web3signerDeleteResponse> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are deleting validators
    cron.stop();

    // Delete feeRecipient on Validator API
    for (const pubkey of deleteRequest.pubkeys)
      await validatorApi
        .deleteFeeRecipient(pubkey)
        .then(() => logger.debug(`Deleted fee recipient in validator API`))
        .catch((err) =>
          logger.error(`Error deleting validator feeRecipient`, err)
        );
    // Delete pubkeys on validator API
    await validatorApi
      .deleteRemoteKeys(deleteRequest)
      .then(() => logger.debug(`Deleted pubkeys in validator API`))
      .catch((err) => logger.error(`Error deleting validator pubkeys`, err));

    // Delete keystores on web3signer API
    const web3signerDeleteResponse = await signerApi.deleteKeystores(
      deleteRequest
    );

    // Write on db
    brainDb.deleteValidators(deleteRequest.pubkeys);

    // IMPORTANT: start the cron
    cron.start();
    return web3signerDeleteResponse;
  } catch (e) {
    cron.restart();
    throw e;
  }
}

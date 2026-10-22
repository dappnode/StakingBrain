import { withValidatorOperationLock } from "../../../db/withValidatorOperationLock.js";
import { Web3SignerApi, ValidatorApi } from "../../../apiClients/index.js";
import { Web3signerDeleteRequest, Web3signerDeleteResponse } from "../../../apiClients/types.js";
import { CronJob } from "../../../cron/cron.js";
import { BrainDataBase } from "../../../db/index.js";
import logger from "../../../logger/index.js";
import { isValidBlsPubkey, prefix0xPubkey } from "@stakingbrain/common";

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
  reloadValidatorsCronTask,
  validatorApi,
  signerApi,
  brainDb,
  deleteRequest
}: {
  reloadValidatorsCronTask: CronJob;
  validatorApi: ValidatorApi;
  signerApi: Web3SignerApi;
  brainDb: BrainDataBase;
  deleteRequest: Web3signerDeleteRequest;
}): Promise<Web3signerDeleteResponse> {
  return withValidatorOperationLock(brainDb, async () => {
    try {
      if (
        !deleteRequest ||
        !Array.isArray(deleteRequest.pubkeys) ||
        deleteRequest.pubkeys.length === 0 ||
        Array.from(deleteRequest.pubkeys).some(
          (key) => typeof key !== "string" || !isValidBlsPubkey(prefix0xPubkey(key))
        )
      )
        throw new Error("Select valid validator public keys to delete");
      deleteRequest = { pubkeys: deleteRequest.pubkeys.map(prefix0xPubkey) };
      // Pause future ticks while this operation holds the shared validator lock.
      reloadValidatorsCronTask.stop();

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
      brainDb.deleteValidators(
        deleteRequest.pubkeys.filter((_, index) =>
          ["deleted", "not_found", "not_active"].includes(web3signerDeleteResponse.data[index]?.status)
        )
      );

      // IMPORTANT: start the cron
      reloadValidatorsCronTask.start();
      return web3signerDeleteResponse;
    } catch (e) {
      reloadValidatorsCronTask.restart();
      throw e;
    }
  });
}

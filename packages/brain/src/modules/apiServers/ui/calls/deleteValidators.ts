import { withValidatorOperationLock } from "../../../db/withValidatorOperationLock.js";
import { Web3SignerApi, ValidatorApi } from "../../../apiClients/index.js";
import { Web3signerDeleteRequest, Web3signerDeleteResponse } from "../../../apiClients/types.js";
import { CronJob } from "../../../cron/cron.js";
import { BrainDataBase } from "../../../db/index.js";
import logger from "../../../logger/index.js";
import { isValidBlsPubkey, prefix0xPubkey } from "@stakingbrain/common";

/**
 * Delete keystores:
 * Stop signing first. Only remove client settings for confirmed deletions.
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

      // Delete keystores on web3signer API
      const web3signerDeleteResponse = await signerApi.deleteRemoteKeys(deleteRequest);

      const deletedPubkeys = deleteRequest.pubkeys.filter((_, index) =>
        ["deleted", "not_found", "not_active"].includes(web3signerDeleteResponse.data[index]?.status)
      );
      // Persist before client cleanup so reload can finish an interrupted deletion.
      brainDb.deleteValidators(deletedPubkeys);
      if (deletedPubkeys.length > 0) {
        const clientResponse = await validatorApi
          .deleteRemoteKeys({ pubkeys: deletedPubkeys })
          .catch((err) => logger.error(`Error deleting validator pubkeys`, err));
        for (const [index, pubkey] of deletedPubkeys.entries()) {
          if (!clientResponse || !["deleted", "not_found"].includes(clientResponse.data[index]?.status)) continue;
          await validatorApi
            .deleteFeeRecipient(pubkey)
            .catch((err) => logger.error(`Error deleting validator feeRecipient`, err));
        }
      }

      // IMPORTANT: start the cron
      reloadValidatorsCronTask.start();
      return web3signerDeleteResponse;
    } catch (e) {
      reloadValidatorsCronTask.restart();
      throw e;
    }
  });
}

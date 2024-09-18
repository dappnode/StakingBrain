import { ValidatorApi } from "../../apiClients/index.js";
import logger from "../../logger/index.js";

/**
 * Post pubkeys that are in the DB and not in the validator API
 */
export async function postValidatorPubkeysFromDb({
  validatorApi,
  signerUrl,
  brainDbPubkeysToAdd,
  validatorPubkeys
}: {
  validatorApi: ValidatorApi;
  signerUrl: string;
  brainDbPubkeysToAdd: string[];
  validatorPubkeys: string[];
}): Promise<void> {
  if (brainDbPubkeysToAdd.length > 0) {
    logger.debug(`Found ${brainDbPubkeysToAdd.length} validators to add to validator API`);
    const postKeysResponse = await validatorApi.postRemoteKeys({
      remote_keys: brainDbPubkeysToAdd.map((pubkey) => ({
        pubkey,
        url: signerUrl
      }))
    });

    for (const [index, pubkeyToAdd] of brainDbPubkeysToAdd.entries()) {
      const postKeyStatus = postKeysResponse.data[index].status;
      if (postKeyStatus === "imported" || postKeyStatus === "duplicate") validatorPubkeys.push(pubkeyToAdd);
      else
        logger.error(
          `Error adding pubkey ${pubkeyToAdd} to validator API: ${postKeyStatus} ${postKeysResponse.data[index].message}`
        );
    }
  }
}

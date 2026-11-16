import { ValidatorApi } from "../../apiClients/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

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
    logger.debug(`${logPrefix}Found ${brainDbPubkeysToAdd.length} validators to add to validator API`);
    const postKeysResponse = await validatorApi.postRemoteKeys({
      remote_keys: brainDbPubkeysToAdd.map((pubkey) => ({
        pubkey,
        url: signerUrl
      }))
    });

    for (const [index, pubkeyToAdd] of brainDbPubkeysToAdd.entries()) {
      // A missing result is uncertain; leave the key out so the next reload tries again.
      const result = postKeysResponse.data[index];
      if (result?.status === "imported" || result?.status === "duplicate") validatorPubkeys.push(pubkeyToAdd);
      else
        logger.error(
          `${logPrefix}Error adding pubkey ${pubkeyToAdd} to validator API: ${result?.status ?? "no result"} ${result?.message ?? ""}`
        );
    }
  }
}

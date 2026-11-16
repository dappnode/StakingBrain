import { Web3SignerApi } from "../../apiClients/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Delete from the validator API the pubkeys that are in the validator API and not in the DB
 */
export async function deleteSignerPubkeysNotInDb({
  signerApi,
  signerPubkeys,
  dbPubkeys
}: {
  signerApi: Web3SignerApi;
  signerPubkeys: string[];
  dbPubkeys: string[];
}): Promise<void> {
  const dbKeys = new Set(dbPubkeys.map((pubkey) => pubkey.toLowerCase()));
  const signerPubkeysToRemove = signerPubkeys.filter((pubkey) => !dbKeys.has(pubkey.toLowerCase()));

  if (signerPubkeysToRemove.length > 0) {
    logger.debug(`${logPrefix}Found ${signerPubkeysToRemove.length} validators to remove from signer`);

    const signerDeleteResponse = await signerApi.deleteRemoteKeys({
      pubkeys: signerPubkeysToRemove
    });

    for (const [index, pubkeyToRemove] of signerPubkeysToRemove.entries()) {
      // A missing result is uncertain; keep the key listed so later steps treat it as still present.
      const result = signerDeleteResponse.data[index];
      if (result?.status === "deleted" || result?.status === "not_found")
        signerPubkeys.splice(signerPubkeys.indexOf(pubkeyToRemove), 1);
      else
        logger.error(
          `${logPrefix}Error deleting pubkey ${pubkeyToRemove} from signer API: ${result?.message ?? "signer did not return a result"}`
        );
    }
  }
}

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
  const signerPubkeysToRemove = signerPubkeys.filter((pubkey) => !dbPubkeys.includes(pubkey));

  if (signerPubkeysToRemove.length > 0) {
    logger.debug(`${logPrefix}Found ${signerPubkeysToRemove.length} validators to remove from signer`);

    const signerDeleteResponse = await signerApi.deleteRemoteKeys({
      pubkeys: signerPubkeysToRemove
    });

    for (const [index, pubkeyToRemove] of signerPubkeysToRemove.entries()) {
      const signerDeleteStatus = signerDeleteResponse.data[index].status;
      if (signerDeleteStatus === "deleted" || signerDeleteStatus === "not_found")
        signerPubkeys.splice(signerPubkeys.indexOf(pubkeyToRemove), 1);
      else
        logger.error(
          `${logPrefix}Error deleting pubkey ${pubkeyToRemove} from signer API: ${signerDeleteResponse.data[index].message}`
        );
    }
  }
}

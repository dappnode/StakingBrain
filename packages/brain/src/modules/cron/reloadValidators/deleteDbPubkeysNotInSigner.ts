import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Delete from the signer API the pubkeys that are in the DB and not in the signer API
 */
export async function deleteDbPubkeysNotInSigner({
  brainDb,
  dbPubkeys,
  signerPubkeys
}: {
  brainDb: BrainDataBase;
  dbPubkeys: string[];
  signerPubkeys: string[];
}): Promise<void> {
  const dbPubkeysToRemove = dbPubkeys.filter((pubkey) => !signerPubkeys.includes(pubkey));

  if (dbPubkeysToRemove.length > 0) {
    logger.debug(`${logPrefix}Found ${dbPubkeysToRemove.length} validators to remove from DB`);
    brainDb.deleteValidators(dbPubkeysToRemove);
    dbPubkeys.splice(0, dbPubkeys.length, ...dbPubkeys.filter((pubkey) => !dbPubkeysToRemove.includes(pubkey)));
  }
}

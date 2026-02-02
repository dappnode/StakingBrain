import { Web3SignerApi, ValidatorApi, BeaconchainApi } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { deleteDbPubkeysNotInSigner } from "./deleteDbPubkeysNotInSigner.js";
import { deleteSignerPubkeysNotInDb } from "./deleteSignerPubkeysNotInDb.js";
import { deleteValidatorPubkeysNotInDB } from "./deleteValidatorPubkeysNotInDb.js";
import { logPrefix } from "./logPrefix.js";
import { postValidatorPubkeysFromDb } from "./postValidatorPubkeysFromDb.js";
import { postValidatorsFeeRecipientsFromDb } from "./postValidatorsFeeRecipientsFromDb.js";
import { persistValidatorIndices } from "./persistValidatorIndices.js";

/**
 * Reload db data based on truth sources: validator and signer APIs:
 * - GET signer API pubkeys
 * - GET validator API pubkeys and fee recipients
 * - DELETE from signer API pubkeys that are not in DB
 * - DELETE from DB pubkeys that are not in signer API
 * - DELETE to validator API pubkeys that are in validator API and not in DB
 * - POST to validator API fee recipients that are in DB and not in validator API
 * - FETCH and PERSIST validator indices from Beacon API for pubkeys without indices
 *
 */
export async function reloadValidators(
  signerApi: Web3SignerApi,
  signerUrl: string,
  validatorApi: ValidatorApi,
  beaconchainApi: BeaconchainApi,
  brainDb: BrainDataBase
): Promise<void> {
  try {
    logger.debug(`${logPrefix}Reloading data...`);

    // 0. Check signer API upcheck endpoint
    await signerApi.upcheck();

    // 1. GET data
    const dbPubkeys = Object.keys(brainDb.getData());
    const signerPubkeys = (await signerApi.listRemoteKeys()).data.map((keystore) => keystore.validating_pubkey);

    // 2. DELETE from signer API pubkeys that are not in DB
    await deleteSignerPubkeysNotInDb({ signerApi, signerPubkeys, dbPubkeys });

    // 3. DELETE from DB pubkeys that are not in signer API
    await deleteDbPubkeysNotInSigner({ brainDb, dbPubkeys, signerPubkeys });

    const validatorPubkeys = (await validatorApi.getRemoteKeys()).data.map((keystore) => keystore.pubkey);

    // 4. POST to validator API pubkeys that are in DB and not in validator API
    await postValidatorPubkeysFromDb({
      validatorApi,
      signerUrl,
      brainDbPubkeysToAdd: dbPubkeys.filter((pubkey) => !validatorPubkeys.includes(pubkey)),
      validatorPubkeys
    });

    // 5. DELETE to validator API pubkeys that are in validator API and not in DB
    await deleteValidatorPubkeysNotInDB({
      validatorApi,
      validatorPubkeys,
      validatorPubkeysToRemove: validatorPubkeys.filter((pubkey) => !dbPubkeys.includes(pubkey))
    });

    // 6. POST to validator API fee recipients that are in DB in validator API
    await postValidatorsFeeRecipientsFromDb({
      validatorApi,
      dbData: brainDb.getData()
    });

    // 7. FETCH and PERSIST validator indices from Beacon API for all pubkeys in DB
    await persistValidatorIndices({
      beaconchainApi,
      brainDb
    });

    logger.debug(`${logPrefix}Finished reloading data`);
  } catch (e) {
    logger.error(`${logPrefix}Error reloading data`, e);
  }
}

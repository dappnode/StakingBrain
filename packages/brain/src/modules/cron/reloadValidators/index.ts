import { withValidatorOperationLock } from "../../db/withValidatorOperationLock.js";
import { Web3SignerApi, ValidatorApi } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { deleteDbPubkeysNotInSigner } from "./deleteDbPubkeysNotInSigner.js";
import { deleteSignerPubkeysNotInDb } from "./deleteSignerPubkeysNotInDb.js";
import { deleteValidatorPubkeysNotInDB } from "./deleteValidatorPubkeysNotInDb.js";
import { logPrefix } from "./logPrefix.js";
import { postValidatorPubkeysFromDb } from "./postValidatorPubkeysFromDb.js";
import { postValidatorsFeeRecipientsFromDb } from "./postValidatorsFeeRecipientsFromDb.js";
import { postValidatorsBuilderConfigsFromDb } from "./postValidatorsBuilderConfigsFromDb.js";

/**
 * Reload db data based on truth sources: validator and signer APIs:
 * - GET signer API pubkeys
 * - GET validator API pubkeys and fee recipients
 * - DELETE from signer API pubkeys that are not in DB
 * - DELETE from DB pubkeys that are not in signer API
 * - DELETE to validator API pubkeys that are in validator API and not in DB
 * - POST to validator API fee recipients that are in DB and not in validator API
 *
 */
export async function reloadValidators(
  signerApi: Web3SignerApi,
  signerUrl: string,
  validatorApi: ValidatorApi,
  brainDb: BrainDataBase
): Promise<void> {
  return withValidatorOperationLock(brainDb, async () => {
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

      const signerKeys = new Set(signerPubkeys.map((pubkey) => pubkey.toLowerCase()));
      const data = brainDb.getData();
      const confirmedImports = dbPubkeys.filter(
        (pubkey) => data[pubkey].importPending && signerKeys.has(pubkey.toLowerCase())
      );
      if (confirmedImports.length > 0)
        brainDb.updateValidators(confirmedImports.map((pubkey) => ({ pubkey, importPending: undefined })));
      // Preserve pending records, but do not activate keys the signer has not confirmed.
      const activeData = Object.fromEntries(
        Object.entries(brainDb.getData()).filter(([pubkey]) => signerKeys.has(pubkey.toLowerCase()))
      );

      const validatorPubkeys = (await validatorApi.getRemoteKeys()).data.map((keystore) => keystore.pubkey);
      const validatorKeys = new Set(validatorPubkeys.map((pubkey) => pubkey.toLowerCase()));
      const dbKeys = new Set(dbPubkeys.map((pubkey) => pubkey.toLowerCase()));

      // 4. POST to validator API pubkeys that are in DB and not in validator API
      await postValidatorPubkeysFromDb({
        validatorApi,
        signerUrl,
        brainDbPubkeysToAdd: Object.keys(activeData).filter((pubkey) => !validatorKeys.has(pubkey.toLowerCase())),
        validatorPubkeys
      });

      // 5. DELETE to validator API pubkeys that are in validator API and not in DB
      await deleteValidatorPubkeysNotInDB({
        validatorApi,
        validatorPubkeys,
        validatorPubkeysToRemove: validatorPubkeys.filter((pubkey) => !dbKeys.has(pubkey.toLowerCase()))
      });

      // 6. POST to validator API fee recipients that are in DB in validator API
      await postValidatorsFeeRecipientsFromDb({
        validatorApi,
        dbData: activeData
      });

      // Independently retry managed configuration after key imports and fee destinations.
      await postValidatorsBuilderConfigsFromDb({ validatorApi, dbData: activeData });
      logger.debug(`${logPrefix}Finished reloading data`);
    } catch (e) {
      logger.error(`${logPrefix}Error reloading data`, e);
    }
  });
}

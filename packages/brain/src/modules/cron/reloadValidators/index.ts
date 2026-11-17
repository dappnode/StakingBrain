import { featureFlags } from "@stakingbrain/common";
import { withValidatorOperationLock } from "../../db/withValidatorOperationLock.js";
import { Web3SignerApi, ValidatorApi } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { deleteDbPubkeysNotInSigner } from "./deleteDbPubkeysNotInSigner.js";
import { deleteSignerPubkeysNotInDb } from "./deleteSignerPubkeysNotInDb.js";
import { deleteValidatorPubkeysNotInDB } from "./deleteValidatorPubkeysNotInDb.js";
import { logPrefix } from "./logPrefix.js";
import { takeListRecheck } from "../../validatorList/readState.js";
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
 * Key membership (steps 0-5) is reconciled under one lock; per-key settings are then applied in short
 * locked slices that re-read the database, so user operations never wait for a whole pass.
 */
/** Steps that tidy up rather than configure: log a failure and carry on with the pass. */
async function continueOnFailure(step: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (e) {
    logger.error(`${logPrefix}${step} failed; continuing so desired validators are still configured`, e);
  }
}

export async function reloadValidators(
  signerApi: Web3SignerApi,
  signerUrl: string,
  validatorApi: ValidatorApi,
  brainDb: BrainDataBase
): Promise<void> {
  try {
    logger.debug(`${logPrefix}Reloading data...`);
    // Steps 0-5 reconcile key membership with a few bulk calls under one lock.
    const activePubkeys = await withValidatorOperationLock(brainDb, () =>
      syncValidatorKeys(signerApi, signerUrl, validatorApi, brainDb)
    );

    // 6. POST to validator API fee recipients that are in DB in validator API. One request per key, so
    // it holds the lock in short slices: a long pass on a large node must not lock out user operations.
    const fees = await postValidatorsFeeRecipientsFromDb({ validatorApi, brainDb, pubkeys: activePubkeys });

    // Independently retry managed configuration after key imports and fee destinations. Skip it when the
    // client stopped responding: every request would wait for its timeout and delay the next pass.
    if (featureFlags.builderConfig) {
      if (fees === "stopped") logger.debug(`${logPrefix}Skipping builder configuration: validator client unavailable`);
      else await postValidatorsBuilderConfigsFromDb({ validatorApi, brainDb, pubkeys: activePubkeys });
    }
    // Repairs such as restored fee recipients change no database record. If an open UI last saw a
    // problem, announce the pass so it lists again (and checks the fee recipients by GET).
    if (takeListRecheck(brainDb)) brainDb.notifyChanged();
    logger.debug(`${logPrefix}Finished reloading data`);
  } catch (e) {
    logger.error(`${logPrefix}Error reloading data`, e);
  }
}

/** Steps 0-5. Returns the keys the signer holds, in database spelling, for per-key configuration. */
async function syncValidatorKeys(
  signerApi: Web3SignerApi,
  signerUrl: string,
  validatorApi: ValidatorApi,
  brainDb: BrainDataBase
): Promise<string[]> {
  // 0. Check signer API upcheck endpoint
  await signerApi.upcheck();

  // 1. GET data
  const dbPubkeys = Object.keys(brainDb.getData());
  const signerPubkeys = (await signerApi.listRemoteKeys()).data.map((keystore) => keystore.validating_pubkey);

  // 2. DELETE from signer API pubkeys that are not in DB. Keys whose deletion fails stay listed, so
  // the database keeps them and the next pass retries.
  await continueOnFailure("Deleting signer keys not in the database", () =>
    deleteSignerPubkeysNotInDb({ signerApi, signerPubkeys, dbPubkeys })
  );

  // 3. DELETE from DB pubkeys that are not in signer API
  await deleteDbPubkeysNotInSigner({ brainDb, dbPubkeys, signerPubkeys });

  const signerKeys = new Set(signerPubkeys.map((pubkey) => pubkey.toLowerCase()));
  const data = brainDb.getData();
  const confirmedImports = dbPubkeys.filter(
    (pubkey) => data[pubkey]?.importPending && signerKeys.has(pubkey.toLowerCase())
  );
  if (confirmedImports.length > 0)
    brainDb.updateValidators(confirmedImports.map((pubkey) => ({ pubkey, importPending: undefined })));
  // Preserve pending records, but do not activate keys the signer has not confirmed.
  const activePubkeys = Object.keys(brainDb.getData()).filter((pubkey) => signerKeys.has(pubkey.toLowerCase()));

  const validatorPubkeys = (await validatorApi.getRemoteKeys()).data.map((keystore) => keystore.pubkey);
  const validatorKeys = new Set(validatorPubkeys.map((pubkey) => pubkey.toLowerCase()));
  const dbKeys = new Set(dbPubkeys.map((pubkey) => pubkey.toLowerCase()));

  // 4. POST to validator API pubkeys that are in DB and not in validator API
  const brainDbPubkeysToAdd = activePubkeys.filter((pubkey) => !validatorKeys.has(pubkey.toLowerCase()));
  await continueOnFailure("Adding keys to the validator client", () =>
    postValidatorPubkeysFromDb({ validatorApi, signerUrl, brainDbPubkeysToAdd, validatorPubkeys })
  );

  // 5. DELETE to validator API pubkeys that are in validator API and not in DB
  const validatorPubkeysToRemove = validatorPubkeys.filter((pubkey) => !dbKeys.has(pubkey.toLowerCase()));
  // Cleanup must not stop desired validators from being configured; failed removals stay listed and
  // are retried next pass.
  await continueOnFailure("Removing obsolete keys from the validator client", () =>
    deleteValidatorPubkeysNotInDB({ validatorApi, validatorPubkeys, validatorPubkeysToRemove })
  );
  // Client membership is shown in the UI; repairs here change it without touching the database.
  if (brainDbPubkeysToAdd.length > 0 || validatorPubkeysToRemove.length > 0) brainDb.notifyChanged();

  return activePubkeys;
}

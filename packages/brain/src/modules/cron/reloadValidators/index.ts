import { Web3SignerApi, ValidatorApi, ApiError } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { deleteDbPubkeysNotInSigner } from "./deleteDbPubkeysNotInSigner.js";
import { deleteSignerPubkeysNotInDb } from "./deleteSignerPubkeysNotInDb.js";
import { deleteValidatorPubkeysNotInDB } from "./deleteValidatorPubkeysNotInDb.js";
import { getValidatorsFeeRecipients } from "./getValidatorsFeeRecipients.js";
import { postValidatorPubkeysFromDb } from "./postValidatorPubkeysFromDb.js";
import { postValidatorsFeeRecipientsFromDb } from "./postValidatorsFeeRecipientsFromDb.js";

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
  try {
    logger.debug(`Reloading data...`);

    // 0. GET status
    const signerApiStatus = await signerApi.getStatus();

    // If web3signer API is not UP, skip data reload and further steps.
    // This is done to avoid unintended DB modifications when the API is down.
    // Status can be "UP" | "DOWN" | "UNKNOWN" | "LOADING" | "ERROR";
    if (signerApiStatus.status !== "UP") {
      logger.warn(
        `Web3Signer is ${signerApiStatus.status}. Skipping data reload until Web3Signer is UP. Trying again in next jobexecution`
      );
      return;
    }

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

    // 6. POST to validator API fee recipients that are in DB and not in validator API
    await postValidatorsFeeRecipientsFromDb({
      validatorApi,
      dbData: brainDb.getData(),
      validatorPubkeysFeeRecipients: await getValidatorsFeeRecipients({
        validatorApi,
        validatorPubkeys
      })
    });

    logger.debug(`Finished reloading data`);
  } catch (e) {
    if (e instanceof ApiError && e.code) {
      switch (e.code) {
        case "ECONNREFUSED":
          e.message += `Connection refused by the server ${e.hostname}. Make sure the port is open and the server is running`;
          break;
        case "ECONNRESET":
          e.message += `Connection reset by the server ${e.hostname}, check server logs`;
          break;
        case "ENOTFOUND":
          e.message += `Host ${e.hostname} not found. Make sure the server is running and the hostname is correct`;
          break;
        case "ERR_HTTP":
          e.message += `HTTP error code ${e.errno}`;
          break;
        default:
          e.message += `Unknown error`;
          break;
      }

      logger.error(`Error reloading data`, e);
    } else {
      logger.error(`Unknown error reloading data`, e);
    }
  }
}
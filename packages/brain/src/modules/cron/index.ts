import { CronJob } from "cron";
import { brainDb, signerApi } from "../../index.js";
import logger from "../logger/index.js";
import { StakingBrainDb } from "@stakingbrain/common";

/**
 * The cronjob must execute the follwing tasks:
 * - Delete validators from signer that are not in the db
 * - Delete validators from db that are not in the signer
 * - Add pubkeys and fee recipient to validator api that are in the db
 *
 * WARNING: What happens if there is no fee recipient for a given validator? default?
 *
 * TODO: move this code into a module to be reused
 */
export const job = new CronJob(
  "* * * * * *",
  async function (): Promise<void> {
    if (!brainDb.data) {
      logger.warn(`[Cron] Database is empty`);
      return;
    }

    const validatorsFromSigner = (await signerApi.getKeystores()).data.map(
      (validator) => validator.validating_pubkey
    );
    if (validatorsFromSigner.length > 0) {
      logger.debug(`[Cron] Got ${validatorsFromSigner.length} validators`);

      // Delete validators from signer that are not in the db
      const validatorsToRemove = validatorsFromSigner.filter(
        (pubkey) => !(brainDb.data as StakingBrainDb)[pubkey]
      );
      if (validatorsToRemove.length > 0) {
        logger.debug(
          `[Cron] Found ${validatorsToRemove.length} validators to remove`
        );
        await signerApi.deleteKeystores({ pubkeys: validatorsToRemove });
      }

      // Delete validators from db that are not in the signer
      const validatorsToRemoveFromDb = Object.keys(brainDb.data).filter(
        (pubkey) => !validatorsFromSigner.includes(pubkey)
      );
      if (validatorsToRemoveFromDb.length > 0) {
        logger.debug(
          `[Cron] Found ${validatorsToRemoveFromDb.length} validators to remove from db`
        );
        brainDb.deletePubkeys(validatorsToRemoveFromDb);
      }
    }

    // Add pubkeys and fee recipient to validator api that are in the db
    // TODO: deppends on validator API implementation
    brainDb.read();
  },
  null,
  false
);

import { CronJob } from "cron";
import { signerApi } from "../../index.js";
import logger from "../logger/index.js";

/**
 * The cronjob must execute the follwing tasks:
 * - GET the list of validators from the signer API
 * - GET the fee recipients for each validator from the db
 * - For each validator, POST the the pubkey and the fee recipient to the validator API
 *
 * WARNING: What happens if there is no fee recipient for a given validator? default?
 *
 */

export const job = new CronJob(
  "* * * * * *",
  async function (): Promise<void> {
    const validators = await signerApi.getKeystores();
    logger.debug(validators);
  },
  null,
  false
);

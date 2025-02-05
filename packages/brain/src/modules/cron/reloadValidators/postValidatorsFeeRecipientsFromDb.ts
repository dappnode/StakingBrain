import { ValidatorApi } from "../../apiClients/index.js";
import { StakingBrainDb } from "../../db/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Post in the validator API fee recipients that are in the DB in the validator API
 */
export async function postValidatorsFeeRecipientsFromDb({
  validatorApi,
  dbData
}: {
  validatorApi: ValidatorApi;
  dbData: StakingBrainDb;
}): Promise<void> {
  for (const [pubkey, { feeRecipient }] of Object.entries(dbData)) {
    await validatorApi
      .setFeeRecipient(feeRecipient, pubkey)
      .catch((e) =>
        logger.error(
          `${logPrefix}Error posting fee recipient ${feeRecipient} for pubkey ${pubkey} to validator API: ${e}`
        )
      );
  }
}

import { ValidatorApi } from "../../apiClients/index.js";
import { StakingBrainDb } from "../../db/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Post in the validator API fee recipients that are in the DB and not in the validator API
 */
export async function postValidatorsFeeRecipientsFromDb({
  validatorApi,
  dbData,
  validatorPubkeysFeeRecipients
}: {
  validatorApi: ValidatorApi;
  dbData: StakingBrainDb;
  validatorPubkeysFeeRecipients: { pubkey: string; feeRecipient: string }[];
}): Promise<void> {
  const feeRecipientsToPost = validatorPubkeysFeeRecipients
    .filter((validator) => validator.feeRecipient !== dbData[validator.pubkey].feeRecipient)
    .map((validator) => ({
      pubkey: validator.pubkey,
      feeRecipient: dbData[validator.pubkey].feeRecipient
    }));

  if (feeRecipientsToPost.length > 0) {
    logger.debug(`${logPrefix}Found ${feeRecipientsToPost.length} fee recipients to add/update to validator API`);
    for (const { pubkey, feeRecipient } of feeRecipientsToPost)
      await validatorApi
        .setFeeRecipient(feeRecipient, pubkey)
        .catch((e) =>
          logger.error(
            `${logPrefix}Error adding fee recipient ${feeRecipient} to validator API for pubkey ${pubkey}`,
            e
          )
        );
  }
}

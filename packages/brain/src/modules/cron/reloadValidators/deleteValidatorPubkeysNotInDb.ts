import { ValidatorApi } from "../../apiClients/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Delete from the validator API the pubkeys that are in the validator API and not in the DB
 */
export async function deleteValidatorPubkeysNotInDB({
  validatorApi,
  validatorPubkeys,
  validatorPubkeysToRemove
}: {
  validatorApi: ValidatorApi;
  validatorPubkeys: string[];
  validatorPubkeysToRemove: string[];
}): Promise<void> {
  if (validatorPubkeysToRemove.length > 0) {
    logger.debug(`${logPrefix}Found ${validatorPubkeysToRemove.length} validators to remove from validator API`);

    const deleteValidatorKeysResponse = await validatorApi.deleteRemoteKeys({
      pubkeys: validatorPubkeysToRemove
    });

    for (const [index, pubkeyToRemove] of validatorPubkeysToRemove.entries()) {
      const deleteValidatorKeyStatus = deleteValidatorKeysResponse.data[index].status;

      if (deleteValidatorKeyStatus === "deleted" || deleteValidatorKeyStatus === "not_found")
        validatorPubkeys.splice(validatorPubkeys.indexOf(pubkeyToRemove), 1);
      else
        logger.error(
          `${logPrefix}Error deleting pubkey ${pubkeyToRemove} from validator API: ${deleteValidatorKeyStatus} ${deleteValidatorKeysResponse.data[index].message}`
        );
    }
  }
}

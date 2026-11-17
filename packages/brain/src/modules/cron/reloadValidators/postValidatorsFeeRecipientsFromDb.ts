import { ValidatorApi } from "../../apiClients/index.js";
import { receivedHttpResponse } from "../../apiClients/error.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";
import { forEachInLockedSlices } from "./forEachInLockedSlices.js";

/** A healthy client answers a fee recipient write quickly; a hung one must not stall the pass for long. */
export const FEE_RECIPIENT_TIMEOUT_MS = 10 * 1000;

/**
 * Post to the validator client the fee recipient stored for each key.
 *
 * An HTTP error concerns one key, so the pass carries on with the rest. A request that gets no response
 * (timeout, refused or reset connection) means the client is unavailable: stop, rather than wait on every
 * remaining key, and let the next pass start over.
 */
export async function postValidatorsFeeRecipientsFromDb({
  validatorApi,
  brainDb,
  pubkeys,
  timeoutMs = FEE_RECIPIENT_TIMEOUT_MS,
  maxHoldMs
}: {
  validatorApi: ValidatorApi;
  brainDb: BrainDataBase;
  pubkeys: readonly string[];
  timeoutMs?: number;
  maxHoldMs?: number;
}): Promise<void> {
  await forEachInLockedSlices(
    brainDb,
    pubkeys,
    async (pubkey, { feeRecipient }) => {
      try {
        await validatorApi.setFeeRecipient(feeRecipient, pubkey, { timeout: timeoutMs });
        return "continue";
      } catch (e) {
        if (!receivedHttpResponse(e)) {
          logger.error(
            `${logPrefix}Validator client did not respond while posting fee recipients; retrying all keys next pass`,
            e
          );
          return "stop";
        }
        logger.error(
          `${logPrefix}Error posting fee recipient ${feeRecipient} for pubkey ${pubkey} to validator API: ${e}`
        );
        return "continue";
      }
    },
    { maxHoldMs }
  );
}

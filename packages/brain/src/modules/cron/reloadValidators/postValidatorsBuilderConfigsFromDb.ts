import { BuilderConfig } from "@stakingbrain/common";
import { ValidatorApi } from "../../apiClients/index.js";
import { receivedHttpResponse } from "../../apiClients/error.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";
import { forEachInLockedSlices } from "./forEachInLockedSlices.js";

export async function applyValidatorBuilderConfig(
  validatorApi: ValidatorApi,
  pubkey: string,
  config: BuilderConfig | null | undefined
): Promise<void> {
  if (config === null) await validatorApi.deleteBuilderConfig(pubkey);
  else if (config !== undefined) await validatorApi.setBuilderConfig(config, pubkey);
}

/**
 * Replay original overrides, including reset intent. Never copy resolved GET values.
 * Like fee recipients, an HTTP error concerns one key; no response at all stops the step.
 */
export async function postValidatorsBuilderConfigsFromDb({
  validatorApi,
  brainDb,
  pubkeys
}: {
  validatorApi: ValidatorApi;
  brainDb: BrainDataBase;
  pubkeys: readonly string[];
}): Promise<"completed" | "stopped"> {
  return forEachInLockedSlices(brainDb, pubkeys, async (pubkey, { builderConfig }) => {
    try {
      await applyValidatorBuilderConfig(validatorApi, pubkey, builderConfig);
      return "continue";
    } catch (error) {
      if (!receivedHttpResponse(error)) {
        logger.error(
          `${logPrefix}Validator client did not respond while applying builder configuration; retrying next pass`,
          error
        );
        return "stop";
      }
      logger.error(`${logPrefix}Error applying builder configuration for ${pubkey}`, error);
      return "continue";
    }
  });
}

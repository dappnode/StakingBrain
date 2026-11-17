import { BuilderConfig } from "@stakingbrain/common";
import { ValidatorApi } from "../../apiClients/index.js";
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

/** Replay original overrides, including reset intent. Never copy resolved GET values. */
export async function postValidatorsBuilderConfigsFromDb({
  validatorApi,
  brainDb,
  pubkeys
}: {
  validatorApi: ValidatorApi;
  brainDb: BrainDataBase;
  pubkeys: readonly string[];
}): Promise<void> {
  await forEachInLockedSlices(brainDb, pubkeys, async (pubkey, { builderConfig }) => {
    await applyValidatorBuilderConfig(validatorApi, pubkey, builderConfig).catch((error) =>
      logger.error(`${logPrefix}Error applying builder configuration for ${pubkey}`, error)
    );
    return "continue";
  });
}

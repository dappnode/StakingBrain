import { BuilderConfig } from "@stakingbrain/common";
import { ValidatorApi } from "../../apiClients/index.js";
import { StakingBrainDb } from "../../db/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

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
  dbData
}: {
  validatorApi: ValidatorApi;
  dbData: StakingBrainDb;
}): Promise<void> {
  for (const [pubkey, { builderConfig }] of Object.entries(dbData)) {
    await applyValidatorBuilderConfig(validatorApi, pubkey, builderConfig).catch((error) =>
      logger.error(`${logPrefix}Error applying builder configuration for ${pubkey}`, error)
    );
  }
}

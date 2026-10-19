import { isValidBlsPubkey, prefix0xPubkey } from "@stakingbrain/common";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi } from "../../../apiClients/validator/index.js";
import { ValidatorBuilderConfigResponse } from "./types.js";

export async function getBuilderConfigs({
  pubkeys,
  brainDb,
  validatorApi
}: {
  pubkeys: string[];
  brainDb: BrainDataBase;
  validatorApi: ValidatorApi;
}): Promise<ValidatorBuilderConfigResponse[]> {
  if (
    !Array.isArray(pubkeys) ||
    pubkeys.some((key) => typeof key !== "string" || !isValidBlsPubkey(prefix0xPubkey(key)))
  )
    throw new Error("pubkeys must be an array of validator BLS public keys");
  const dbData = brainDb.getData();
  const results: ValidatorBuilderConfigResponse[] = [];
  for (const key of pubkeys) {
    const pubkey = prefix0xPubkey(key);
    if (!dbData[pubkey]) throw new Error(`Validator ${pubkey} is not in the database`);
    const builderConfig = dbData[pubkey].builderConfig;
    const result: ValidatorBuilderConfigResponse = {
      pubkey,
      builderConfig,
      application:
        validatorApi.getBuilderConfigStatus(pubkey) ??
        (builderConfig === undefined ? undefined : { status: "pending" }),
      status: "success"
    };
    try {
      result.resolved = (await validatorApi.getBuilderConfig(pubkey)).data;
    } catch (error) {
      result.status = "error";
      result.message = error.message;
    }
    results.push(result);
  }
  return results;
}

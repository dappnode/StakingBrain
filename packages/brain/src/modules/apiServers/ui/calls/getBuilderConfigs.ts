import { isValidBlsPubkey, prefix0xPubkey } from "@stakingbrain/common";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi } from "../../../apiClients/validator/index.js";
import { ValidatorBuilderConfigResponse } from "./types.js";

const READ_CONCURRENCY = 8;
const READ_DEADLINE_MS = 10000;

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
  const results: ValidatorBuilderConfigResponse[] = pubkeys.map((key) => {
    const pubkey = prefix0xPubkey(key);
    if (!dbData[pubkey]) throw new Error(`Validator ${pubkey} is not in the database`);
    const builderConfig = dbData[pubkey].builderConfig;
    return {
      pubkey,
      builderConfig,
      application:
        validatorApi.getBuilderConfigStatus(pubkey) ??
        (builderConfig === undefined ? undefined : { status: "pending" }),
      status: "success"
    };
  });
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), READ_DEADLINE_MS);
  let next = 0;
  try {
    await Promise.all(
      Array.from({ length: Math.min(READ_CONCURRENCY, results.length) }, async () => {
        while (next < results.length) {
          const result = results[next++];
          try {
            if (controller.signal.aborted) throw new Error("Client status check timed out; refresh to retry");
            result.resolved = (await validatorApi.getBuilderConfig(result.pubkey, controller.signal)).data;
          } catch (error) {
            result.status = "error";
            result.message = controller.signal.aborted
              ? "Client status check timed out; refresh to retry"
              : error.message;
          }
        }
      })
    );
  } finally {
    clearTimeout(deadline);
  }
  return results;
}

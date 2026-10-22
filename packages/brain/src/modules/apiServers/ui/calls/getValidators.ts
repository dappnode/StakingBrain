import { isValidWithdrawableBlsAddress, isValidNonWithdrawableBlsAddress } from "@stakingbrain/common";
import { CustomValidatorGetResponse } from "./types.js";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi, Web3SignerApi, BeaconchainApi } from "../../../apiClients/index.js";
import logger from "../../../logger/index.js";

type BeaconDetails = Pick<CustomValidatorGetResponse, "index" | "withdrawalCredentials">;
type ListProgress = {
  beaconNext: number;
  feeNext: number;
  beacon: Map<string, { expires: number; details: BeaconDetails }>;
};
const listProgress = new WeakMap<BrainDataBase, ListProgress>();
const BEACON_CACHE_MS = 60_000;

/** Read a stable snapshot; independent queues rotate unfinished work across bounded refreshes. */
export async function getValidators({
  brainDb,
  validatorApi,
  signerApi,
  beaconchainApi
}: {
  brainDb: BrainDataBase;
  validatorApi: ValidatorApi;
  signerApi: Web3SignerApi;
  beaconchainApi: BeaconchainApi;
}): Promise<CustomValidatorGetResponse[]> {
  const entries = Object.entries(brainDb.getData());
  const progress = listProgress.get(brainDb) ?? { beaconNext: 0, feeNext: 0, beacon: new Map() };
  listProgress.set(brainDb, progress);
  const currentKeys = new Set(entries.map(([pubkey]) => pubkey));
  for (const [pubkey, cached] of progress.beacon) {
    if (!currentKeys.has(pubkey) || cached.expires <= Date.now()) progress.beacon.delete(pubkey);
  }
  if (entries.length === 0) return [];
  const results: CustomValidatorGetResponse[] = entries.map(([pubkey, details]) => ({
    pubkey,
    index: details.index?.toString() ?? "",
    tag: details.tag,
    feeRecipient: details.feeRecipient,
    builderConfig: details.builderConfig,
    builderConfigStatus:
      validatorApi.getBuilderConfigStatus(pubkey) ??
      (details.builderConfig === undefined ? undefined : { status: "pending" }),
    withdrawalCredentials: { address: "", format: "error" },
    ...progress.beacon.get(pubkey)?.details
    // Membership and fee checks stay undefined until a successful read establishes their value.
  }));
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 10000);

  async function readQueue(
    cursor: "beaconNext" | "feeNext",
    read: (result: CustomValidatorGetResponse) => Promise<void>
  ) {
    const start = progress[cursor] % results.length;
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(8, results.length) }, async () => {
        while (next < results.length && !controller.signal.aborted) {
          const index = (start + next++) % results.length;
          progress[cursor] = (index + 1) % results.length;
          try {
            await read(results[index]);
          } catch (error) {
            logger.error(error);
          }
        }
      })
    );
  }

  try {
    await Promise.all([
      (async () => {
        try {
          const remoteKeys = await validatorApi.getRemoteKeys(controller.signal);
          const keys = new Set(remoteKeys.data.map(({ pubkey }) => pubkey.toLowerCase()));
          for (const result of results) result.validatorImported = keys.has(result.pubkey.toLowerCase());
          await readQueue("feeNext", async (result) => {
            if (!result.validatorImported) return;
            const response = await validatorApi.getFeeRecipient(result.pubkey, controller.signal);
            result.validatorFeeRecipientCorrect =
              response.data.ethaddress.toLowerCase() === result.feeRecipient.toLowerCase();
          });
        } catch (error) {
          logger.error(error);
        }
      })(),
      (async () => {
        try {
          const signerKeys = await signerApi.listRemoteKeys(controller.signal);
          const keys = new Set(signerKeys.data.map(({ validating_pubkey }) => validating_pubkey.toLowerCase()));
          for (const result of results) result.signerImported = keys.has(result.pubkey.toLowerCase());
        } catch (error) {
          logger.error(error);
        }
      })(),
      readQueue("beaconNext", async (result) => {
        const cached = progress.beacon.get(result.pubkey);
        if (cached) {
          Object.assign(result, cached.details);
          return;
        }
        const { data } = await beaconchainApi.getStateValidator({
          state: "head",
          pubkey: result.pubkey,
          signal: controller.signal
        });
        const address = data.validator.withdrawal_credentials;
        const details: BeaconDetails = {
          index: data.index,
          withdrawalCredentials: {
            address,
            format: isValidWithdrawableBlsAddress(address)
              ? "ecdsa"
              : isValidNonWithdrawableBlsAddress(address)
                ? "bls"
                : "unknown"
          }
        };
        Object.assign(result, details);
        progress.beacon.set(result.pubkey, { details, expires: Date.now() + BEACON_CACHE_MS });
      })
    ]);
    return results;
  } finally {
    clearTimeout(deadline);
  }
}

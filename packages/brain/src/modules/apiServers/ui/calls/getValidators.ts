import { isValidWithdrawableBlsAddress, isValidNonWithdrawableBlsAddress, featureFlags } from "@stakingbrain/common";
import { CustomValidatorGetResponse } from "./types.js";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi, Web3SignerApi, BeaconchainApi } from "../../../apiClients/index.js";
import logger from "../../../logger/index.js";

type BeaconDetails = Pick<CustomValidatorGetResponse, "index" | "withdrawalCredentials">;
type ListProgress = {
  beaconNext: number;
  feeNext: number;
  beacon: Map<string, { expires: number; details: BeaconDetails }>;
  // Keyed by the expected fee recipient so an edit is re-checked immediately.
  fee: Map<string, { expires: number; feeRecipient: string; correct: boolean }>;
};
const listProgress = new WeakMap<BrainDataBase, ListProgress>();
const BEACON_CACHE_MS = 60_000; // Also bounds how stale a cached fee recipient check can be.

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
  const progress = listProgress.get(brainDb) ?? { beaconNext: 0, feeNext: 0, beacon: new Map(), fee: new Map() };
  listProgress.set(brainDb, progress);
  const currentKeys = new Set(entries.map(([pubkey]) => pubkey));
  for (const [pubkey, cached] of progress.beacon) {
    if (!currentKeys.has(pubkey) || cached.expires <= Date.now()) progress.beacon.delete(pubkey);
  }
  for (const [pubkey, cached] of progress.fee) {
    if (!currentKeys.has(pubkey) || cached.expires <= Date.now()) progress.fee.delete(pubkey);
  }
  if (entries.length === 0) return [];
  const results: CustomValidatorGetResponse[] = entries.map(([pubkey, details]) => ({
    pubkey,
    index: details.index?.toString() ?? "",
    tag: details.tag,
    feeRecipient: details.feeRecipient,
    // Stored settings are kept while the feature is off, but not surfaced.
    ...(featureFlags.builderConfig && {
      builderConfig: details.builderConfig,
      builderConfigStatus:
        validatorApi.getBuilderConfigStatus(pubkey) ??
        (details.builderConfig === undefined ? undefined : { status: "pending" })
    }),
    withdrawalCredentials: { address: "", format: "error" },
    ...progress.beacon.get(pubkey)?.details
    // Membership and fee checks stay undefined until a successful read establishes their value.
  }));
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 10000);
  // Reads cut short by the deadline stay pending so the UI knows to refresh; definite failures do not.
  const beaconPending = new Set(results.map((_, index) => index));
  const feePending = new Set<number>();
  let membershipPending = false;

  async function readQueue(
    cursor: "beaconNext" | "feeNext",
    pending: Set<number>,
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
            pending.delete(index);
          } catch (error) {
            if (!controller.signal.aborted) pending.delete(index);
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
          results.forEach((result, index) => {
            result.validatorImported = keys.has(result.pubkey.toLowerCase());
            if (result.validatorImported) feePending.add(index);
          });
          await readQueue("feeNext", feePending, async (result) => {
            if (!result.validatorImported) return;
            const feeRecipient = result.feeRecipient.toLowerCase();
            const cached = progress.fee.get(result.pubkey);
            if (cached?.feeRecipient === feeRecipient) {
              result.validatorFeeRecipientCorrect = cached.correct;
              return;
            }
            const response = await validatorApi.getFeeRecipient(result.pubkey, controller.signal);
            result.validatorFeeRecipientCorrect = response.data.ethaddress.toLowerCase() === feeRecipient;
            progress.fee.set(result.pubkey, {
              feeRecipient,
              correct: result.validatorFeeRecipientCorrect,
              expires: Date.now() + BEACON_CACHE_MS
            });
          });
        } catch (error) {
          if (controller.signal.aborted) membershipPending = true;
          logger.error(error);
        }
      })(),
      (async () => {
        try {
          const signerKeys = await signerApi.listRemoteKeys(controller.signal);
          const keys = new Set(signerKeys.data.map(({ validating_pubkey }) => validating_pubkey.toLowerCase()));
          for (const result of results) result.signerImported = keys.has(result.pubkey.toLowerCase());
        } catch (error) {
          if (controller.signal.aborted) membershipPending = true;
          logger.error(error);
        }
      })(),
      readQueue("beaconNext", beaconPending, async (result) => {
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
    results.forEach((result, index) => {
      result.detailsPending = membershipPending || beaconPending.has(index) || feePending.has(index);
    });
    return results;
  } finally {
    clearTimeout(deadline);
  }
}

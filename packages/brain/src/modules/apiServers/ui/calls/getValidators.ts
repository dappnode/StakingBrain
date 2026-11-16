import { featureFlags } from "@stakingbrain/common";
import { CustomValidatorGetResponse } from "./types.js";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi, Web3SignerApi } from "../../../apiClients/index.js";
import { BeaconStatusStore } from "../../../beaconStatus/index.js";
import { forEachConcurrently } from "../../../utils/forEachConcurrently.js";
import logger from "../../../logger/index.js";
import { listReadStateFor } from "../../../validatorList/readState.js";

/** Bound on one list request; unfinished reads are reported as pending for the UI to request again. */
export const LIST_DEADLINE_MS = 10_000;
const READ_CONCURRENCY = 8;
const FEE_CHECK_TTL_MS = 60_000;

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * List validators with their signer and validator client status, read within one bounded request.
 * Reads cut off by the deadline are marked `detailsPending` (request again); failed reads are reported
 * in `detailsError` rather than replaced by an earlier result. Beacon details come from the beacon
 * store, which announces its updates.
 */
export async function getValidators({
  brainDb,
  validatorApi,
  signerApi,
  beaconStatus
}: {
  brainDb: BrainDataBase;
  validatorApi: ValidatorApi;
  signerApi: Web3SignerApi;
  beaconStatus: BeaconStatusStore;
}): Promise<CustomValidatorGetResponse[]> {
  const entries = Object.entries(brainDb.getData());
  if (entries.length === 0) return [];
  const state = listReadStateFor(brainDb);
  const now = Date.now();
  const present = new Set(entries.map(([pubkey]) => pubkey));
  for (const [pubkey, check] of state.fee) if (!present.has(pubkey) || check.expires <= now) state.fee.delete(pubkey);

  const rows: CustomValidatorGetResponse[] = entries.map(([pubkey, details]) => {
    const { beaconError, ...beacon } = beaconStatus.view(pubkey);
    return {
      pubkey,
      tag: details.tag,
      feeRecipient: details.feeRecipient,
      ...beacon,
      index: details.index?.toString() ?? beacon.index ?? "",
      detailsPending: false,
      detailsError: beaconError,
      // Stored settings are kept while the feature is off, but not surfaced.
      ...(featureFlags.builderConfig && {
        builderConfig: details.builderConfig,
        builderConfigStatus:
          validatorApi.getBuilderConfigStatus(pubkey) ??
          (details.builderConfig === undefined ? undefined : { status: "pending" })
      })
    };
  });
  const errors = rows.map((row) => (row.detailsError ? [row.detailsError] : []));
  const pending = new Set<number>();

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), LIST_DEADLINE_MS);
  const { signal } = controller;
  /** Cut off by the deadline: pending. Anything else: a definite failure to report. */
  const failed = (indexes: Iterable<number>, what: string, error: unknown) => {
    for (const index of indexes) {
      if (signal.aborted) pending.add(index);
      else errors[index].push(`${what}: ${message(error)}`);
    }
  };

  try {
    await Promise.all([
      (async () => {
        try {
          const keys = new Set(
            (await signerApi.listRemoteKeys(signal)).data.map(({ validating_pubkey }) =>
              validating_pubkey.toLowerCase()
            )
          );
          for (const row of rows) row.signerImported = keys.has(row.pubkey.toLowerCase());
        } catch (error) {
          logger.error(error);
          failed(rows.keys(), "Could not read the signer's keys", error);
        }
      })(),
      (async () => {
        let keys: Set<string>;
        try {
          keys = new Set((await validatorApi.getRemoteKeys(signal)).data.map(({ pubkey }) => pubkey.toLowerCase()));
        } catch (error) {
          logger.error(error);
          failed(rows.keys(), "Could not read the validator client's keys", error);
          return;
        }
        // Fee recipients are only checked for keys the client has; cached checks need a current
        // membership read, so an outage is never hidden behind an earlier success.
        const toRead: number[] = [];
        rows.forEach((row, index) => {
          row.validatorImported = keys.has(row.pubkey.toLowerCase());
          // A check made before the key left the client says nothing about it once it returns.
          if (!row.validatorImported) {
            state.fee.delete(row.pubkey);
            return;
          }
          const cached = state.fee.get(row.pubkey);
          if (cached?.expected === row.feeRecipient.toLowerCase()) row.validatorFeeRecipientCorrect = cached.correct;
          else toRead.push(index);
        });
        // Resume where the previous request stopped, so a large list converges over a few requests.
        const start = toRead.findIndex((index) => index >= state.feeNext % rows.length);
        const order = start <= 0 ? toRead : [...toRead.slice(start), ...toRead.slice(0, start)];
        order.forEach((index) => pending.add(index));
        await forEachConcurrently(order, READ_CONCURRENCY, async (index) => {
          if (signal.aborted) return;
          // Advance on dispatch: reads that hang until the deadline must not hold the next request back.
          state.feeNext = index + 1;
          const row = rows[index];
          const expected = row.feeRecipient.toLowerCase();
          const generation = state.generation;
          try {
            const { data } = await validatorApi.getFeeRecipient(row.pubkey, signal);
            row.validatorFeeRecipientCorrect = data.ethaddress.toLowerCase() === expected;
            pending.delete(index);
            if (state.generation === generation)
              state.fee.set(row.pubkey, {
                expected,
                correct: row.validatorFeeRecipientCorrect,
                expires: Date.now() + FEE_CHECK_TTL_MS
              });
          } catch (error) {
            if (!signal.aborted) pending.delete(index);
            logger.error(error);
            failed([index], "Could not read the fee recipient", error);
          }
        });
      })()
    ]);
  } finally {
    clearTimeout(deadline);
  }

  rows.forEach((row, index) => {
    row.detailsPending = pending.has(index);
    row.detailsError = errors[index].length > 0 ? errors[index].join("; ") : undefined;
  });
  // Problems reconciliation may fix: ask it to announce itself when it next completes.
  state.recheck = rows.some(
    ({ detailsPending, detailsError, validatorFeeRecipientCorrect }) =>
      detailsPending || detailsError !== undefined || validatorFeeRecipientCorrect === false
  );
  return rows;
}

import type { Web3signerDeleteResponse } from "@stakingbrain/brain";
import { Batch, BatchProgress, BatchResult, retryableIndexes, runBatches } from "./batchRunner";

/**
 * Deleting is quicker than importing, but each key still costs signer, validator client and fee
 * recipient calls; batches keep each call short and let the UI show progress and stop between them.
 */
export const DELETE_BATCH_SIZE = 25;
/** In the batch being deleted right now. */
export const DELETING = "deleting";
/** Statuses that need no retry: the signer no longer holds the key. */
export const DELETED_STATUSES = ["deleted", "not_active", "not_found"] as const;

export type DeleteBatch = Batch<{ pubkeys: string[] }>;

export function planDeleteBatches(pubkeys: readonly string[], only?: readonly number[]): DeleteBatch[] {
  const selected = only ?? pubkeys.map((_, index) => index);
  const batches: DeleteBatch[] = [];
  for (let start = 0; start < selected.length; start += DELETE_BATCH_SIZE) {
    const indexes = selected.slice(start, start + DELETE_BATCH_SIZE);
    batches.push({ indexes, request: { pubkeys: indexes.map((index) => pubkeys[index]) } });
  }
  return batches;
}

/**
 * Combine the slashing protection exports of several batches into one interchange file. They come
 * from the same signer, so they share metadata. An export that cannot be parsed is kept as its own
 * file rather than dropped: losing slashing history is not acceptable.
 */
export function mergeInterchanges(exports: readonly string[]): string[] {
  const parsed: { metadata?: unknown; data: unknown[] }[] = [];
  const unparsable: string[] = [];
  for (const text of exports) {
    try {
      const value = JSON.parse(text);
      if (value && typeof value === "object" && Array.isArray(value.data)) parsed.push(value);
      else unparsable.push(text);
    } catch {
      unparsable.push(text);
    }
  }
  const merged =
    parsed.length > 0
      ? [JSON.stringify({ metadata: parsed[0].metadata, data: parsed.flatMap(({ data }) => data) })]
      : [];
  return [...merged, ...unparsable];
}

/** Delete in batches with live progress; slashing protection exports are collected from every batch. */
export async function runDeleteBatches({
  batches,
  results,
  deleteBatch,
  onProgress,
  shouldStop
}: {
  batches: readonly DeleteBatch[];
  results: readonly BatchResult[];
  deleteBatch: (request: { pubkeys: string[] }) => Promise<Web3signerDeleteResponse>;
  onProgress: (progress: BatchProgress, results: BatchResult[]) => void;
  shouldStop: () => boolean;
}): Promise<{ results: BatchResult[]; stopped?: "user" | "error"; slashingProtection: string[] }> {
  const exports: string[] = [];
  const outcome = await runBatches({
    batches,
    results,
    send: async (request: { pubkeys: string[] }) => {
      const response = await deleteBatch(request);
      if (response.slashing_protection) exports.push(response.slashing_protection);
      return response;
    },
    toResults: (response, batch) =>
      batch.indexes.map(
        (_, offset) =>
          response.data[offset] ?? {
            status: "error",
            message: "Deletion outcome unknown: Brain returned no result for this key. Retry to check."
          }
      ),
    active: { status: DELETING, message: "Deleting…" },
    onProgress,
    shouldStop
  });
  return { ...outcome, slashingProtection: exports };
}

export function retryableDeletes(results: readonly BatchResult[]): number[] {
  return retryableIndexes(results, DELETED_STATUSES);
}

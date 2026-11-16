import type { CustomImportRequest, Web3signerPostResponse } from "@stakingbrain/brain";
import { prefix0xPubkey, RPC_MAX_PAYLOAD_BYTES } from "@stakingbrain/common";

/**
 * Keystore decryption in the signer is slow, so one RPC call per batch keeps every call well inside
 * the RPC timeout, lets the UI report progress and lets the user stop between batches.
 */
export const IMPORT_BATCH_SIZE = 20;
// Well below the transport limit: JSON escaping roughly doubles keystore text and slashing data rides along.
const IMPORT_BATCH_MAX_BYTES = RPC_MAX_PAYLOAD_BYTES / 4;

export interface ImportResult {
  status: string;
  message?: string;
}

export interface ImportBatch {
  /** Positions in the original file list, so results stay aligned with the files the user picked. */
  indexes: number[];
  request: CustomImportRequest;
}

export interface ImportProgress {
  done: number;
  total: number;
  batch: number;
  batches: number;
}

export const NOT_ATTEMPTED = "not_attempted";

export function notAttempted(): ImportResult {
  return { status: NOT_ATTEMPTED, message: "Not imported yet: the import stopped before reaching this validator." };
}

/** Keep only the slashing history of the batch's keys; the signer only needs those. */
export function filterInterchange(interchange: string, pubkeys: ReadonlySet<string>): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(interchange);
  } catch {
    return interchange; // Let the signer report the malformed file once, as before.
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { data?: unknown }).data)) return interchange;
  const record = parsed as { data: { pubkey?: unknown }[] };
  return JSON.stringify({
    ...record,
    data: record.data.filter(
      (entry) => typeof entry?.pubkey === "string" && pubkeys.has(prefix0xPubkey(entry.pubkey).toLowerCase())
    )
  });
}

/** Split an import into ordered batches by count and size. `only` limits a retry to some files. */
export function planImportBatches(
  request: CustomImportRequest,
  pubkeys: readonly string[],
  {
    only,
    maxKeystores = IMPORT_BATCH_SIZE,
    maxBytes = IMPORT_BATCH_MAX_BYTES
  }: { only?: readonly number[]; maxKeystores?: number; maxBytes?: number } = {}
): ImportBatch[] {
  const selected = only ?? request.validatorsImportRequest.map((_, index) => index);
  const groups: number[][] = [];
  let group: number[] = [];
  let bytes = 0;
  for (const index of selected) {
    const { keystore, password } = request.validatorsImportRequest[index];
    const size = keystore.length + password.length;
    if (group.length > 0 && (group.length >= maxKeystores || bytes + size > maxBytes)) {
      groups.push(group);
      group = [];
      bytes = 0;
    }
    group.push(index);
    bytes += size;
  }
  if (group.length > 0) groups.push(group);

  return groups.map((indexes) => ({
    indexes,
    request: {
      importFrom: request.importFrom,
      slashing_protection:
        request.slashing_protection === undefined
          ? undefined
          : filterInterchange(
              request.slashing_protection,
              new Set(indexes.map((index) => prefix0xPubkey(pubkeys[index]).toLowerCase()))
            ),
      validatorsImportRequest: indexes.map((index) => request.validatorsImportRequest[index])
    }
  }));
}

/**
 * Import batches in order. A failed batch stops the run: its error may be a timeout whose outcome is
 * unknown, and the remaining files are left "not attempted" so the user can retry them safely
 * (keys that did land are reported as duplicates).
 */
export async function runImportBatches({
  batches,
  results: initial,
  importBatch,
  onProgress,
  shouldStop
}: {
  batches: readonly ImportBatch[];
  results: readonly ImportResult[];
  importBatch: (request: CustomImportRequest) => Promise<Web3signerPostResponse>;
  onProgress: (progress: ImportProgress, results: ImportResult[]) => void;
  shouldStop: () => boolean;
}): Promise<{ results: ImportResult[]; stopped?: "user" | "error" }> {
  const results = [...initial];
  for (const { indexes } of batches) for (const index of indexes) results[index] = notAttempted();
  const total = batches.reduce((sum, { indexes }) => sum + indexes.length, 0);
  let done = 0;
  onProgress({ done, total, batch: 0, batches: batches.length }, [...results]);

  for (const [position, batch] of batches.entries()) {
    if (shouldStop()) return { results, stopped: "user" };
    let failed = false;
    try {
      const response = await importBatch(batch.request);
      batch.indexes.forEach((index, offset) => {
        results[index] = response.data[offset] ?? {
          status: "error",
          message: "Import outcome unknown: Brain returned no result for this key. Retry to check."
        };
      });
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      for (const index of batch.indexes) results[index] = { status: "error", message };
    }
    done += batch.indexes.length;
    onProgress({ done, total, batch: position + 1, batches: batches.length }, [...results]);
    if (failed) return { results, stopped: "error" };
  }
  return { results };
}

/** Files worth retrying: anything not confirmed imported or already present. */
export function retryableIndexes(results: readonly ImportResult[]): number[] {
  return results.flatMap((result, index) => (["imported", "duplicate"].includes(result?.status) ? [] : [index]));
}

export function summarizeImport(results: readonly ImportResult[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const { status } of results) summary[status] = (summary[status] ?? 0) + 1;
  return summary;
}

import type { CustomImportRequest, Web3signerPostResponse } from "@stakingbrain/brain";
import { prefix0xPubkey, RPC_MAX_PAYLOAD_BYTES } from "@stakingbrain/common";

/**
 * Keystore decryption in the signer is slow, so one RPC call per batch keeps every call well inside
 * the RPC timeout, lets the UI report progress and lets the user stop between batches.
 */
export const IMPORT_BATCH_SIZE = 20;
// Sizes below are exact encoded bytes; keep a margin under the transport limit for RPC framing.
const IMPORT_BATCH_MAX_BYTES = Math.floor(RPC_MAX_PAYLOAD_BYTES * 0.9);
const encoder = new TextEncoder();
const byteLength = (text: string) => encoder.encode(text).byteLength;

export interface ImportResult {
  status: string;
  message?: string;
}

export interface ImportBatch {
  /** Positions in the original file list, so results stay aligned with the files the user picked. */
  indexes: number[];
  request: CustomImportRequest;
  /** Set when a single key cannot fit one request; it is reported as an error without being sent. */
  tooLarge?: { bytes: number; maxBytes: number };
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

type Interchange = { data: { pubkey?: unknown }[] };

function parseInterchange(interchange: string): Interchange | undefined {
  try {
    const parsed: unknown = JSON.parse(interchange);
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { data?: unknown }).data))
      return parsed as Interchange;
  } catch {
    // Fall through: let the signer report the malformed file, as before.
  }
  return undefined;
}

const entryPubkey = (entry: { pubkey?: unknown }) =>
  typeof entry?.pubkey === "string" ? prefix0xPubkey(entry.pubkey).toLowerCase() : undefined;

/** Keep only the slashing history of the batch's keys; the signer only needs those. */
export function filterInterchange(interchange: string, pubkeys: ReadonlySet<string>): string {
  const record = parseInterchange(interchange);
  if (!record) return interchange;
  return JSON.stringify({
    ...record,
    data: record.data.filter((entry) => pubkeys.has(entryPubkey(entry) ?? ""))
  });
}

/**
 * Bytes each part adds to the serialized RPC request. `slashing_protection` travels as a JSON string
 * inside JSON, so its entries are measured after a second round of escaping.
 */
function measureImport(request: CustomImportRequest, pubkeys: readonly string[]) {
  const record = request.slashing_protection === undefined ? undefined : parseInterchange(request.slashing_protection);
  const slashingBytes = new Map<string, number>();
  for (const entry of record?.data ?? []) {
    const key = entryPubkey(entry);
    if (key)
      slashingBytes.set(key, (slashingBytes.get(key) ?? 0) + byteLength(JSON.stringify(JSON.stringify(entry))) - 1);
  }
  const emptyRequest: CustomImportRequest = {
    importFrom: request.importFrom,
    slashing_protection:
      request.slashing_protection === undefined
        ? undefined
        : record
          ? JSON.stringify({ ...record, data: [] })
          : request.slashing_protection,
    validatorsImportRequest: []
  };
  const base = byteLength(JSON.stringify({ jsonrpc: "2.0", method: "importValidators", params: emptyRequest, id: 0 }));
  const perKey = (index: number) =>
    byteLength(JSON.stringify(request.validatorsImportRequest[index])) +
    1 +
    (pubkeys[index] ? (slashingBytes.get(prefix0xPubkey(pubkeys[index]).toLowerCase()) ?? 0) : 0);
  return { base, perKey };
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
  const { base, perKey } = measureImport(request, pubkeys);
  const groups: number[][] = [];
  const oversized = new Map<number, number>();
  let group: number[] = [];
  let bytes = base;
  for (const index of selected) {
    const size = perKey(index);
    if (base + size > maxBytes) {
      oversized.set(index, base + size);
      continue;
    }
    if (group.length > 0 && (group.length >= maxKeystores || bytes + size > maxBytes)) {
      groups.push(group);
      group = [];
      bytes = base;
    }
    group.push(index);
    bytes += size;
  }
  if (group.length > 0) groups.push(group);

  const tooLarge: ImportBatch[] = [...oversized].map(([index, size]) => ({
    indexes: [index],
    request: { ...request, validatorsImportRequest: [] },
    tooLarge: { bytes: size, maxBytes }
  }));
  return [
    ...tooLarge,
    ...groups.map((indexes) => ({
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
    }))
  ];
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
    if (batch.tooLarge) {
      const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
      results[batch.indexes[0]] = {
        status: "error",
        message: `This keystore and its slashing protection history are too large to import in one request (${mb(batch.tooLarge.bytes)} MB, limit ${mb(batch.tooLarge.maxBytes)} MB). Import it with a pruned slashing protection file.`
      };
      done += 1;
      onProgress({ done, total, batch: position + 1, batches: batches.length }, [...results]);
      continue;
    }
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

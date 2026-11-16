import type { CustomImportRequest, Web3signerPostResponse } from "@stakingbrain/brain";
import { prefix0xPubkey, RPC_MAX_PAYLOAD_BYTES } from "@stakingbrain/common";
import {
  Batch,
  BatchProgress,
  BatchResult,
  NOT_ATTEMPTED,
  notAttempted,
  QUEUED,
  retryableIndexes as retryable,
  runBatches,
  summarize
} from "./batchRunner";

/**
 * Keystore decryption in the signer is slow, so one RPC call per batch keeps every call well inside
 * the RPC timeout, lets the UI report progress and lets the user stop between batches.
 */
export const IMPORT_BATCH_SIZE = 20;
// Sizes below are exact encoded bytes; keep a margin under the transport limit for RPC framing.
const IMPORT_BATCH_MAX_BYTES = Math.floor(RPC_MAX_PAYLOAD_BYTES * 0.9);
const encoder = new TextEncoder();
const byteLength = (text: string) => encoder.encode(text).byteLength;

export type ImportResult = BatchResult;
export type ImportProgress = BatchProgress;
export type ImportBatch = Batch<CustomImportRequest>;
export { NOT_ATTEMPTED, QUEUED, notAttempted };

/** In the batch being imported right now. */
export const IMPORTING = "importing";
/** Statuses that need no retry. */
export const IMPORTED_STATUSES = ["imported", "duplicate"] as const;

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

  const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
  const tooLarge: ImportBatch[] = [...oversized].map(([index, size]) => ({
    indexes: [index],
    // Never sent: the run reports it as an error instead.
    request: { importFrom: request.importFrom, validatorsImportRequest: [] },
    rejected: `This keystore and its slashing protection history are too large to import in one request (${mb(size)} MB, limit ${mb(maxBytes)} MB). Import it with a pruned slashing protection file.`
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

/** Import batches in order with live progress; see runBatches for stop and failure semantics. */
export function runImportBatches({
  batches,
  results,
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
  return runBatches({
    batches,
    results,
    send: importBatch,
    toResults: (response, batch) =>
      batch.indexes.map(
        (_, offset) =>
          response.data[offset] ?? {
            status: "error",
            message: "Import outcome unknown: Brain returned no result for this key. Retry to check."
          }
      ),
    active: { status: IMPORTING, message: "Importing…" },
    onProgress,
    shouldStop
  });
}

/** Files worth retrying: anything not confirmed imported or already present. */
export function retryableIndexes(results: readonly ImportResult[]): number[] {
  return retryable(results, IMPORTED_STATUSES);
}

export const summarizeImport = summarize;

/** Per-validator outcome of a batched operation (import, delete), aligned with the user's selection. */
export interface BatchResult {
  status: string;
  message?: string;
}

export interface BatchProgress {
  done: number;
  total: number;
  /** Batches finished. */
  batch: number;
  batches: number;
  /** Validators in the batch being sent right now; 0 between batches. */
  current: number;
}

export interface Batch<Request> {
  /** Positions in the selection, so results stay aligned with what the user picked. */
  indexes: number[];
  request: Request;
  /** Never sent; reported as an error with this message (e.g. too large for one request). */
  rejected?: string;
}

export const NOT_ATTEMPTED = "not_attempted";
/** Waiting for earlier batches while an operation runs. */
export const QUEUED = "queued";

export function notAttempted(): BatchResult {
  return { status: NOT_ATTEMPTED, message: "Not processed: the operation stopped before reaching this validator." };
}

/**
 * Send batches in order, one request at a time. While running, validators are `active` (current batch)
 * or "queued" (later batches). A failed batch stops the run: its error may be a timeout whose outcome is
 * unknown, so the validators it never reached become "not attempted" and can be retried safely.
 */
export async function runBatches<Request, Response>({
  batches,
  results: initial,
  send,
  toResults,
  active,
  onProgress,
  shouldStop
}: {
  batches: readonly Batch<Request>[];
  results: readonly BatchResult[];
  send: (request: Request) => Promise<Response>;
  /** One result per index of the batch, in order. */
  toResults: (response: Response, batch: Batch<Request>) => BatchResult[];
  active: BatchResult;
  onProgress: (progress: BatchProgress, results: BatchResult[]) => void;
  shouldStop: () => boolean;
}): Promise<{ results: BatchResult[]; stopped?: "user" | "error" }> {
  const results = [...initial];
  const queued: BatchResult = { status: QUEUED, message: "Waiting for earlier batches to finish." };
  for (const { indexes } of batches) for (const index of indexes) results[index] = queued;
  const total = batches.reduce((sum, { indexes }) => sum + indexes.length, 0);
  let done = 0;
  let finished = 0;
  const report = (current: number) =>
    onProgress({ done, total, batch: finished, batches: batches.length, current }, [...results]);
  // Once the run ends early, nothing is waiting any more: say so instead of "queued".
  const end = (stopped: "user" | "error") => {
    for (const [index, result] of results.entries()) if (result?.status === QUEUED) results[index] = notAttempted();
    report(0);
    return { results, stopped };
  };
  report(0);

  for (const [position, batch] of batches.entries()) {
    if (shouldStop()) return end("user");
    if (batch.rejected) {
      for (const index of batch.indexes) results[index] = { status: "error", message: batch.rejected };
      done += batch.indexes.length;
      finished = position + 1;
      report(0);
      continue;
    }
    for (const index of batch.indexes) results[index] = active;
    report(batch.indexes.length);
    let failed = false;
    try {
      const batchResults = toResults(await send(batch.request), batch);
      batch.indexes.forEach((index, offset) => (results[index] = batchResults[offset]));
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      for (const index of batch.indexes) results[index] = { status: "error", message };
    }
    done += batch.indexes.length;
    finished = position + 1;
    if (failed) return end("error");
    report(0);
  }
  return { results };
}

/** Positions worth retrying: anything without one of the given successful statuses. */
export function retryableIndexes(results: readonly BatchResult[], succeeded: readonly string[]): number[] {
  return results.flatMap((result, index) => (succeeded.includes(result?.status) ? [] : [index]));
}

export function summarize(results: readonly BatchResult[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const { status } of results) summary[status] = (summary[status] ?? 0) + 1;
  return summary;
}

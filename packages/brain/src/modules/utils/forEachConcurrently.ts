/** Run `task` for every item with at most `limit` in flight; per-item errors are the task's to handle. */
export async function forEachConcurrently<T>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        await task(items[index], index);
      }
    })
  );
}

/** Keeps per-validator client calls fast for large batches without flooding the validator client. */
export const VALIDATOR_CLIENT_CONCURRENCY = 8;

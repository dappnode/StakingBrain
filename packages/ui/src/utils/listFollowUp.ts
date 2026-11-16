/** Delay before requesting the list again while client reads were cut off by the Brain's deadline. */
export const FOLLOW_UP_MS = 3000;
/** Stop requesting after this many follow-ups in a row that did not reduce the pending rows. */
export const MAX_STALLED_FOLLOW_UPS = 3;

/** Rows whose client reads were cut off: requesting the list again continues them. */
export function countUnfinished(rows: readonly { detailsPending: boolean }[]): number {
  return rows.filter(({ detailsPending }) => detailsPending).length;
}

/** Consecutive follow-ups that made no progress; resets whenever pending rows decrease or clear. */
export function nextStallCount(stalls: number, previousPending: number | undefined, pending: number): number {
  if (pending === 0) return 0;
  return previousPending !== undefined && pending >= previousPending ? stalls + 1 : 0;
}

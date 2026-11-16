import type { GridRowId } from "@mui/x-data-grid";

/** Delay between refreshes while the Brain reports rows whose checks were cut short. */
export const PENDING_REFRESH_MS = 3000;
/** Stop auto-refreshing after this many refreshes in a row without fewer pending rows. */
export const MAX_STALLED_REFRESHES = 3;

/** Grid ids are row positions; keep the same validators selected when a refresh reorders or removes rows. */
export function remapSelection(
  previous: readonly { pubkey: string }[] | undefined,
  next: readonly { pubkey: string }[],
  selected: readonly GridRowId[]
): GridRowId[] {
  if (!previous) return [];
  const positions = new Map(next.map(({ pubkey }, index) => [pubkey.toLowerCase(), index]));
  return selected.flatMap((id) => {
    const position = positions.get(previous[id as number]?.pubkey.toLowerCase() ?? "");
    return position === undefined ? [] : [position];
  });
}

export function countPending(rows: readonly { detailsPending?: boolean }[]): number {
  return rows.filter(({ detailsPending }) => detailsPending).length;
}

/** Track consecutive refreshes that did not reduce the number of pending rows. */
export function nextStallCount(stalls: number, previousPending: number | undefined, pending: number): number {
  if (pending === 0) return 0;
  return previousPending !== undefined && pending >= previousPending ? stalls + 1 : 0;
}

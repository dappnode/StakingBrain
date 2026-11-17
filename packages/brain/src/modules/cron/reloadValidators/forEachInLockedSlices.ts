import type { BrainDataBase } from "../../db/index.js";
import type { PubkeyDetails } from "../../db/types.js";
import { withValidatorOperationLock } from "../../db/withValidatorOperationLock.js";

/**
 * How long one slice of a per-key reload step may hold the validator operation lock. User operations
 * queued meanwhile wait for at most this plus one in-flight client request, far below their wait budget.
 */
export const RELOAD_SLICE_MAX_HOLD_MS = 1000;

export type SliceStep = (pubkey: string, details: PubkeyDetails) => Promise<"continue" | "stop">;

/**
 * Apply `step` to each key, holding the lock only for short time slices so user operations can run in
 * between. Every slice re-reads the database inside the lock, so it always applies the settings stored
 * now, never a value a user operation has since replaced, and skips keys deleted meanwhile. A step that
 * returns "stop" ends the whole run; the next reload pass starts over.
 *
 * @returns "stopped" when a step stopped the run, so callers can skip later steps against the same client
 */
export async function forEachInLockedSlices(
  brainDb: BrainDataBase,
  pubkeys: readonly string[],
  step: SliceStep,
  { maxHoldMs = RELOAD_SLICE_MAX_HOLD_MS }: { maxHoldMs?: number } = {}
): Promise<"completed" | "stopped"> {
  let next = 0;
  let stopped = false;
  while (next < pubkeys.length && !stopped) {
    await withValidatorOperationLock(brainDb, async () => {
      const data = brainDb.getData();
      const deadline = Date.now() + maxHoldMs;
      // At least one key per slice, so every slice makes progress.
      do {
        const pubkey = pubkeys[next++];
        const details = data[pubkey];
        if (!details || details.importPending) continue;
        if ((await step(pubkey, details)) === "stop") stopped = true;
      } while (next < pubkeys.length && !stopped && Date.now() < deadline);
    });
  }
  return stopped ? "stopped" : "completed";
}

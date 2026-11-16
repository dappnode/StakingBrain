import type { BrainDataBase } from "../db/index.js";

export interface FeeCheck {
  expected: string;
  correct: boolean;
  expires: number;
}

/** State shared by successive validator list requests for one database. */
export interface ListReadState {
  /** Where the next request resumes fee reads, so successive requests cover different validators. */
  feeNext: number;
  fee: Map<string, FeeCheck>;
  /** Bumped on every validator change; a read that overlaps one is not cached. */
  generation: number;
  /**
   * The last list response showed something reconciliation may fix (a fee mismatch, a failed or
   * unfinished read). Reconciliation then announces itself when it completes, so idle UIs re-check.
   */
  recheck: boolean;
}

const states = new WeakMap<BrainDataBase, ListReadState>();

export function listReadStateFor(brainDb: BrainDataBase): ListReadState {
  let state = states.get(brainDb);
  if (!state) {
    const created: ListReadState = { feeNext: 0, fee: new Map(), generation: 0, recheck: false };
    // Change notifications arrive after an operation or reconciliation has configured the validator
    // client. A mismatch read before then may be stale, so drop it, and refuse to cache reads that
    // straddle the change. Matches stay: a changed expected address misses the cache anyway.
    brainDb.onChange(() => {
      for (const [pubkey, check] of created.fee) if (!check.correct) created.fee.delete(pubkey);
      created.generation++;
    });
    states.set(brainDb, created);
    state = created;
  }
  return state;
}

/**
 * Called when reconciliation completes: whether the last list response needs re-checking. Clears the
 * flag; the next list response sets it again if the problem persists.
 */
export function takeListRecheck(brainDb: BrainDataBase): boolean {
  const state = states.get(brainDb);
  if (!state?.recheck) return false;
  state.recheck = false;
  return true;
}

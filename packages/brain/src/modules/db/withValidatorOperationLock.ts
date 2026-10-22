import type { BrainDataBase } from "./index.js";

const pendingOperations = new WeakMap<BrainDataBase, Promise<void>>();

/** Keep database snapshots and their client writes ordered, including across awaits. */
export async function withValidatorOperationLock<T>(brainDb: BrainDataBase, operation: () => Promise<T>): Promise<T> {
  const previous = pendingOperations.get(brainDb) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  pendingOperations.set(brainDb, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (pendingOperations.get(brainDb) === current) pendingOperations.delete(brainDb);
  }
}

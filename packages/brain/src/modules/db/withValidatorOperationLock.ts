import type { BrainDataBase } from "./index.js";

const pendingOperations = new WeakMap<BrainDataBase, Promise<void>>();

export class ValidatorOperationBusyError extends Error {
  constructor() {
    super("Brain is busy with another validator operation. Nothing was changed; try again shortly.");
    this.name = "ValidatorOperationBusyError";
  }
}

/**
 * Keep database snapshots and their client writes ordered, including across awaits.
 *
 * With `maxWaitMs`, an operation that cannot start in time is abandoned without running, so a
 * caller that has already given up (for example a timed-out UI request) never changes state later.
 * The abandoned slot still waits for its predecessor, so later operations keep their order.
 */
export async function withValidatorOperationLock<T>(
  brainDb: BrainDataBase,
  operation: () => Promise<T>,
  { maxWaitMs }: { maxWaitMs?: number } = {}
): Promise<T> {
  const previous = pendingOperations.get(brainDb) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  pendingOperations.set(brainDb, current);
  const cleanup = (): void => {
    release();
    if (pendingOperations.get(brainDb) === current) pendingOperations.delete(brainDb);
  };

  if (maxWaitMs !== undefined) {
    let timer: NodeJS.Timeout | undefined;
    const acquired = await Promise.race([
      previous.then(() => true),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), maxWaitMs);
      })
    ]);
    clearTimeout(timer);
    if (!acquired) {
      void previous.then(cleanup);
      throw new ValidatorOperationBusyError();
    }
  } else await previous;

  try {
    return await operation();
  } finally {
    cleanup();
  }
}

/** Leaves most of the UI's RPC_TIMEOUT_MS for the operation itself once it starts. */
export const CLIENT_OPERATION_MAX_WAIT_MS = 30 * 1000;

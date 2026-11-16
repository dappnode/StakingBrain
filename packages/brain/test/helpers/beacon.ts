import type { BeaconchainApi } from "../../src/modules/apiClients/index.js";

/** A beacon node that knows none of the validators, for tests that do not exercise beacon data. */
export const emptyBeacon = (): BeaconchainApi =>
  ({
    postStateValidators: async () => ({ execution_optimistic: false, finalized: true, data: [] })
  }) as unknown as BeaconchainApi;

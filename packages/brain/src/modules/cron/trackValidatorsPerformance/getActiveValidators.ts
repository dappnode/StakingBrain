import { BeaconchainApi } from "../../apiClients/index.js";
import { ValidatorStatus } from "../../apiClients/types.js";

/**
 * Get the active validators from the beaconchain API.
 *
 * @param {BeaconchainApi} beaconchainApi - Beaconchain API client.
 * @param {string[]} validatorIndexes - Array of validator indexes.
 * @returns {string[]} - Array of active validator indexes.
 */
export async function getActiveValidators({
  beaconchainApi,
  validatorIndexes
}: {
  beaconchainApi: BeaconchainApi;
  validatorIndexes: string[];
}): Promise<string[]> {
  return (
    await beaconchainApi.postStateValidators({
      body: {
        ids: validatorIndexes,
        statuses: validatorIndexes.map(() => ValidatorStatus.ACTIVE_ONGOING)
      },
      stateId: "finalized"
    })
  ).data.map((validator) => validator.index);
}

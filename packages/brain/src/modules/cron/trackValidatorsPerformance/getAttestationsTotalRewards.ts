import { BeaconchainApi } from "../../apiClients/index.js";
import { TotalRewards } from "../../apiClients/types.js";

/**
 * Get attestations rewards for the validators.
 *
 * @param {BeaconchainApi} beaconchainApi - Beaconchain API client.
 * @param {string} epoch - The epoch to get the rewards.
 * @param {string[]} activeValidatorsIndexes - Array of active validator indexes.
 * @returns {TotalRewards[]} - Array of total rewards for the validators.
 */
export async function getAttestationsTotalRewards({
  beaconchainApi,
  epoch,
  activeValidatorsIndexes
}: {
  beaconchainApi: BeaconchainApi;
  epoch: string;
  activeValidatorsIndexes: string[];
}): Promise<TotalRewards[]> {
  return (
    await beaconchainApi.getAttestationsRewards({
      epoch,
      pubkeysOrIndexes: activeValidatorsIndexes
    })
  ).data.total_rewards;
}

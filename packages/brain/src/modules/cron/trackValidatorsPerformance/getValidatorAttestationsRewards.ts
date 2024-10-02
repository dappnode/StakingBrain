import { BeaconchainApi } from "../../apiClients/index.js";
import { IdealRewards, TotalRewards } from "../../apiClients/types.js";

/**
 * Get attestations rewards for the validators:
 * - Total rewards
 * - Ideal reward last item from array of IdealRewards -> is the ideal reward maximum that could be achieved by the validator
 */
export async function getValidatorAttestationsRewards({
  beaconchainApi,
  epoch,
  activeValidatorsIndexes
}: {
  beaconchainApi: BeaconchainApi;
  epoch: string;
  activeValidatorsIndexes: string[];
}): Promise<{ totalRewards: TotalRewards[]; idealRewards: IdealRewards }> {
  const attestationsRewards = (
    await beaconchainApi.getAttestationsRewards({
      epoch,
      pubkeysOrIndexes: activeValidatorsIndexes
    })
  ).data;

  return {
    totalRewards: attestationsRewards.total_rewards,
    idealRewards: attestationsRewards.ideal_rewards[attestationsRewards.ideal_rewards.length - 1]
  };
}

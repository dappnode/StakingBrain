import { BeaconchainApi } from "../../apiClients/index.js";
import { EpochErrorCode, ValidatorsDataPerEpochMap } from "../../apiClients/postgres/types.js";
import logger from "../../logger/index.js";

/**
 * Sets attestations rewards for the validators:
 * - Total rewards
 * - Ideal reward last item from array of IdealRewards -> is the ideal reward maximum that could be achieved by the validator
 */
export async function setValidatorAttestationsRewards({
  beaconchainApi,
  epoch,
  validatorsDataPerEpochMap
}: {
  beaconchainApi: BeaconchainApi;
  epoch: string;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
}): Promise<void> {
  const { total_rewards, ideal_rewards } = (
    await beaconchainApi.getAttestationsRewards({
      epoch,
      pubkeysOrIndexes: Array.from(validatorsDataPerEpochMap.keys())
    })
  ).data;
  // Get the last item from the array of ideal rewards which is the ideal reward maximum that could be achieved by the validator
  const idealRewardsLastItem = ideal_rewards[ideal_rewards.length - 1];

  for (const [index, epochData] of validatorsDataPerEpochMap) {
    // Find the total rewards for the validator index
    const totalRewards = total_rewards.find((reward) => reward.validator_index === index);
    if (!totalRewards) {
      logger.warn(`Total rewards not found for validator index: ${index}`);
      validatorsDataPerEpochMap.set(index, {
        ...epochData,
        error: {
          code: EpochErrorCode.MISSING_ATT_DATA,
          message: `Missing attestation data for validator ${index}`
        }
      });
      continue;
    }
    validatorsDataPerEpochMap.set(index, {
      ...epochData,
      attestation: {
        idealRewards: idealRewardsLastItem,
        totalRewards
      }
    });
  }
}

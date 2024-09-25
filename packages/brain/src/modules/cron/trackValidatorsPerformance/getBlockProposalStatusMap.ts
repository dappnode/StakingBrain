import { BeaconchainApi } from "../../apiClients/index.js";
import { BlockProposalStatus } from "../../apiClients/postgres/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Get the map with the block proposal status of each validator.
 *
 * @param {BeaconchainApi} beaconchainApi - Beaconchain API client.
 * @param {string} epoch - The epoch to get the block proposal duties.
 * @param {string[]} activeValidatorIndexes - Array of validator indexes.
 */
export async function getBlockProposalStatusMap({
  beaconchainApi,
  epoch,
  activeValidatorsIndexes
}: {
  beaconchainApi: BeaconchainApi;
  epoch: string;
  activeValidatorsIndexes: string[];
}): Promise<Map<string, BlockProposalStatus>> {
  // Initialize the map with the block proposal status of each validator.
  const validatorBlockStatusMap = new Map<string, BlockProposalStatus>();
  // Get the block proposal duties for the given epoch. Which validators
  // are supposed to propose a block in which slot?
  const blockProposalsResponse = await beaconchainApi.getProposerDuties({
    epoch
  });

  // Utilize a Set for quick lookup. We assume that the validator indexes are unique.
  const validatorIndexesSet = new Set(activeValidatorsIndexes);

  // Initialize all validator's status to Unchosen.
  validatorIndexesSet.forEach((validatorIndex) => {
    validatorBlockStatusMap.set(validatorIndex, BlockProposalStatus.Unchosen);
  });

  // For each slot in the epoch, determine if the validator supposed to propose
  // it is one of our monitored validators. If so, check if the validator did it correctly.
  for (const duty of blockProposalsResponse.data) {
    const { validator_index, slot } = duty;

    // enter loop if one of our monitored validators had to propose in this slot
    if (validatorIndexesSet.has(validator_index)) {
      try {
        // Get the proposer index from the block header for the slot
        const proposerIndex = (await beaconchainApi.getBlockHeader({ blockId: slot })).data.header.message
          .proposer_index;
        // If the proposer index in the block header matches the validator index, the block was proposed correctly.
        validatorBlockStatusMap.set(
          validator_index,
          proposerIndex === validator_index ? BlockProposalStatus.Proposed : BlockProposalStatus.Error
        );
      } catch (error) {
        if (error.status === 404) {
          // If the block header is not found, the validator missed the block proposal
          validatorBlockStatusMap.set(validator_index, BlockProposalStatus.Missed);
        } else {
          // If consensus client doesnt return 200 or 404, something went wrong
          logger.error(`${logPrefix}Error retrieving block header for slot ${slot}: ${error}`);
          validatorBlockStatusMap.set(validator_index, BlockProposalStatus.Error);
        }
      }
    }
  }
  return validatorBlockStatusMap;
}

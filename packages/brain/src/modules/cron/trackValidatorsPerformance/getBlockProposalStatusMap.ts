import { BeaconchainApi } from "../../apiClients/index.js";
import { BlockProposalStatus } from "../../apiClients/postgres/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Get the map with the block proposal status of each validator.
 *
 * @param {BeaconchainApi} beaconchainApi - Beaconchain API client.
 * @param {string} epoch - The epoch to get the block proposal duties.
 * @param {string[]} validatorIndexes - Array of validator indexes.
 */
export async function getBlockProposalStatusMap({
  beaconchainApi,
  epoch,
  validatorIndexes
}: {
  beaconchainApi: BeaconchainApi;
  epoch: string;
  validatorIndexes: string[];
}): Promise<Map<string, BlockProposalStatus>> {
  const blockProposalsResponse = await beaconchainApi.getProposerDuties({
    epoch
  });

  // Map to store the block proposal status of each validator
  const validatorBlockStatus = new Map<string, BlockProposalStatus>();

  // Initialize all validator's status to Unchosen.
  validatorIndexes.forEach((validatorIndex) => {
    validatorBlockStatus.set(validatorIndex, BlockProposalStatus.Unchosen);
  });

  // Since we know block proposal duties, we can check if the validator proposed the block or missed it.
  for (const duty of blockProposalsResponse.data) {
    const { validator_index, slot } = duty;

    if (validatorIndexes.includes(validator_index)) {
      try {
        const blockHeader = await beaconchainApi.getBlockHeader({ blockId: slot });
        // Update status based on whether the validator in the block header matches the one supposed to propose
        // If the duty had a proposer index and it doesn't match with the header proposer index, we did something wrong, so we consider it as an error
        validatorBlockStatus.set(
          validator_index,
          blockHeader.data.header.message.proposer_index == validator_index
            ? BlockProposalStatus.Proposed
            : BlockProposalStatus.Error
        );
      } catch (error) {
        if (error.status === 404) {
          // Consensus clients return 404 a block was missed (there is no block for the slot)
          validatorBlockStatus.set(validator_index, BlockProposalStatus.Missed);
        } else {
          // If consensus client doesnt return 200 or 404, something went wrong
          logger.error(`${logPrefix}Error retrieving block header for slot ${slot}: ${error}`);
          validatorBlockStatus.set(validator_index, BlockProposalStatus.Error); // Something went wrong
        }
      }
    }
  }

  return validatorBlockStatus;
}

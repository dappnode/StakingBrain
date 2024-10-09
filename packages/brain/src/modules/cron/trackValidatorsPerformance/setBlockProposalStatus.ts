import { BeaconchainApi } from "../../apiClients/index.js";
import { BlockProposalStatus, ValidatorsDataPerEpochMap } from "../../apiClients/postgres/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Sets the block proposal status for each validator in the given epoch
 */
export async function setBlockProposalStatus({
  beaconchainApi,
  epoch,
  validatorsDataPerEpochMap
}: {
  beaconchainApi: BeaconchainApi;
  epoch: string;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
}): Promise<void> {
  // Get the block proposal duties for the given epoch. Which validators
  // are supposed to propose a block in which slot?
  const blockProposalsResponse = await beaconchainApi.getProposerDuties({
    epoch
  });

  // Initialize all validator's status to Unchosen in the validatorsDataPerEpochMap
  // only overwrite the block data rest is kept the same
  for (const [validatorIndex, data] of validatorsDataPerEpochMap)
    validatorsDataPerEpochMap.set(validatorIndex, { ...data, block: { status: BlockProposalStatus.Unchosen } });

  // For each slot in the epoch, determine if the validator supposed to propose
  // it is one of our monitored validators. If so, check if the validator did it correctly.
  for (const duty of blockProposalsResponse.data) {
    const { validator_index, slot } = duty;

    // enter loop if one of our monitored validators had to propose in this slot
    const validatorEpochData = validatorsDataPerEpochMap.get(validator_index);
    if (validatorEpochData) {
      try {
        // Get the proposer index from the block header for the slot
        const proposerIndex = (await beaconchainApi.getBlockHeader({ blockId: slot })).data.header.message
          .proposer_index;
        // If the proposer index in the block header matches the validator index, the block was proposed correctly.
        validatorsDataPerEpochMap.set(validator_index, {
          ...validatorEpochData,
          block: {
            status: proposerIndex === validator_index ? BlockProposalStatus.Proposed : BlockProposalStatus.Error
          }
        });
      } catch (error) {
        if (error.status === 404) {
          // If the block header is not found, the validator missed the block proposal
          validatorsDataPerEpochMap.set(validator_index, {
            ...validatorEpochData,
            block: { status: BlockProposalStatus.Missed }
          });
        } else {
          // If consensus client doesnt return 200 or 404, something went wrong
          logger.error(`${logPrefix}Error retrieving block header for slot ${slot}: ${error}`);
          validatorsDataPerEpochMap.set(validator_index, {
            ...validatorEpochData,
            block: { status: BlockProposalStatus.Error }
          });
        }
      }
    }
  }
}

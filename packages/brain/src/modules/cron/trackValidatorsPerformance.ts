import { BeaconchainApi } from "../apiClients/beaconchain/index.js";
import { PostgresClient } from "../apiClients/postgres/index.js";
import logger from "../logger/index.js";
import { ValidatorStatus } from "../apiClients/types.js";
import { BlockProposalStatus } from "../apiClients/postgres/types.js";
import { BrainDataBase } from "../db/index.js";
import { isEmpty } from "lodash-es";

const logPrefix = "[CRON - trackValidatorsPerformance]: ";

// TODO: at this moment Lighthouse client does not support retrieving:
// - liveness of validator from finalized epoch:
// ```400: BAD_REQUEST: request epoch 79833 is more than one epoch from the current epoch 79835```
// - sync committee rewards:
// ```404: NOT_FOUND: Parent state is not available! MissingBeaconState(0xa9592014ad4aa3d5dcc4ef67b669278a85fb4dbe80f12364f2486444b7db3927)```

/**
 * Cron task that will track validators performance for the epoch finalized and store it in the Postgres DB.
 * If any issue is arisen during the process, it will be retried after 1 minute. If the issue persists until the epoch
 * finalized changes, the issue will be logged and stored in the DB.
 *
 * @param validatorPubkeys - The pubkeys of the validators to track.
 * @param postgresClient - Postgres client to interact with the DB.
 * @param beaconchainApi - Beaconchain API client to interact with the Beaconchain API.
 * @param minGenesisTime - The minimum genesis time of the chain.
 */
export async function trackValidatorsPerformance({
  brainDb,
  postgresClient,
  beaconchainApi,
  minGenesisTime,
  secondsPerSlot
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  beaconchainApi: BeaconchainApi;
  minGenesisTime: number;
  secondsPerSlot: number;
}): Promise<void> {
  // get brain db data
  const brainDbData = brainDb.getData();
  // skip if no validators
  if (isEmpty(brainDbData)) return;

  const epochFinalized = await beaconchainApi.getEpochHeader({ blockId: "finalized" });
  let newEpochFinalized = epochFinalized;

  while (epochFinalized === newEpochFinalized) {
    try {
      logger.debug(`${logPrefix}Epoch finalized: ${epochFinalized}`);

      // get validator indexes from brain db
      const validatorIndexes: string[] = [];
      const validatorPubkeysWithNoIndex: string[] = [];
      // iterate over brain db data and push the indexes to the array
      for (const [pubkey, details] of Object.entries(brainDbData)) {
        if (details.index) validatorIndexes.push(details.index.toString());
        else validatorPubkeysWithNoIndex.push(pubkey);
      }

      if (validatorPubkeysWithNoIndex.length > 0) {
        logger.debug(`${logPrefix}Getting validator indexes from pubkeys`);
        await Promise.all(
          validatorPubkeysWithNoIndex.map(async (pubkey) => {
            const index = (await beaconchainApi.getStateValidator({ state: "finalized", pubkey })).data.index;
            validatorIndexes.push(index);
            brainDb.updateValidators({ validators: { [pubkey]: { ...brainDbData[pubkey], index: parseInt(index) } } });
          })
        );
      }
      logger.debug(`${logPrefix}Validator indexes: ${validatorIndexes}`);

      // get only active validators
      logger.debug(`${logPrefix}Getting active validators`);
      const activeValidators = (
        await beaconchainApi.postStateValidators({
          body: {
            ids: validatorIndexes,
            statuses: validatorIndexes.map(() => ValidatorStatus.ACTIVE_ONGOING)
          },
          stateId: "finalized"
        })
      ).data.map((validator) => validator.index);
      logger.debug(`${logPrefix}Active validators: ${activeValidators}`);

      if (activeValidators.length === 0) {
        logger.info(`${logPrefix}No active validators found`);
        return;
      }

      // check node health
      logger.debug(`${logPrefix}Checking node health`);
      const { el_offline, is_syncing } = (await beaconchainApi.getSyncingStatus()).data;
      logger.debug(`${logPrefix}EL Node offline: ${el_offline}, Node syncing: ${is_syncing}`);
      if (el_offline) throw Error("EL Node is offline");
      if (is_syncing) throw Error("Node is syncing");

      // get block attestations
      logger.debug(`${logPrefix}Getting attestations rewards for epoch ${epochFinalized}`);
      const validatorsAttestationsRewards = (
        await beaconchainApi.getAttestationsRewards({
          epoch: epochFinalized.toString(),
          pubkeysOrIndexes: validatorIndexes
        })
      ).data.total_rewards;
      logger.debug(`${logPrefix}Attestations rewards: ${JSON.stringify(validatorsAttestationsRewards)}`);

      // Get block proposal duties
      logger.debug(`${logPrefix}Getting block proposal duties for epoch ${epochFinalized}`);
      const blockProposalsResponse = await beaconchainApi.getProposerDuties({
        epoch: epochFinalized.toString()
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

      // insert performance data
      for (const validatorIndex of validatorIndexes) {
        //const liveness = validatorsLiveness.find((liveness) => liveness.index === validatorIndex)?.is_live;
        const attestationsRewards = validatorsAttestationsRewards.find(
          (attestationReward) => attestationReward.validator_index === validatorIndex
        );

        if (!attestationsRewards) {
          logger.error(`${logPrefix}Missing data for validator ${validatorIndex}, att: ${attestationsRewards}`);
          continue;
        }

        const blockProposalStatus = validatorBlockStatus.get(validatorIndex);
        if (!blockProposalStatus) {
          logger.error(
            `${logPrefix}Missing block proposal data for validator ${validatorIndex}, block: ${blockProposalStatus}`
          );
          continue;
        }

        // write on db
        logger.debug(`${logPrefix}Inserting performance data for validator ${validatorIndex}`);
        await postgresClient.insertPerformanceData({
          validatorIndex: parseInt(validatorIndex),
          epoch: epochFinalized,
          blockProposalStatus: blockProposalStatus,
          attestationsRewards
        });
      }

      logger.debug(`${logPrefix}Performance data inserted for epoch ${epochFinalized}`);
      return;
    } catch (error) {
      logger.error(`${logPrefix}Error occurred: ${error}. Updating epoch finalized and retrying in 1 minute`);
      // skip if the seconds to the next epoch is less than 1 minute
      const minuteInSeconds = 60;
      const secondsToNextEpoch = getSecondsToNextEpoch({ minGenesisTime, secondsPerSlot });
      if (secondsToNextEpoch < minuteInSeconds) {
        logger.warn(
          `${logPrefix}Seconds to the next epoch is less than 1 minute (${secondsToNextEpoch}). Skipping until next epoch`
        );
        return;
      }
      // wait 1 minute without blocking the event loop
      await new Promise((resolve) => setTimeout(resolve, minuteInSeconds * 1000));
      // update epoch finalized
      newEpochFinalized = await beaconchainApi.getEpochHeader({ blockId: "finalized" });
    }
  }
  logger.debug(
    `${logPrefix}Epoch finalized changed: ${newEpochFinalized}, finished tracking performance for epoch ${epochFinalized}`
  );
}

/**
 * Get the seconds to the start of the next epoch based on the current Unix time and the minimum genesis time of the chain.
 *
 * @param {number} minGenesisTime - Minimum genesis time of the chain.
 * @param {number} secondsPerSlot - Seconds per slot.
 * @returns {number} - Seconds to the start of the next epoch.
 */
export function getSecondsToNextEpoch({
  minGenesisTime,
  secondsPerSlot
}: {
  minGenesisTime: number;
  secondsPerSlot: number;
}): number {
  const currentUnixTime = Math.floor(Date.now() / 1000);
  const timeDifference = currentUnixTime - minGenesisTime; // Time difference in seconds
  const stlotsSinceGenesis = timeDifference / secondsPerSlot; // Slots since genesis
  const currentEpoch = Math.floor(stlotsSinceGenesis / 32); // Current epoch
  const nextEpochStartSlot = (currentEpoch + 1) * 32; // Slot at the start of the next epoch
  const nextEpochStartTime = nextEpochStartSlot * secondsPerSlot + minGenesisTime; // Time at the start of the next epoch in seconds
  return nextEpochStartTime - currentUnixTime; // Return the difference in seconds
}

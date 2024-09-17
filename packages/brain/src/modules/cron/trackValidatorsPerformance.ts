import { BeaconchainApi } from "../apiClients/beaconchain/index.js";
import { PostgresClient } from "../apiClients/postgres/index.js";
import logger from "../logger/index.js";
import { ValidatorStatus } from "../apiClients/types.js";
import { BlockProposalStatus } from "../apiClients/postgres/types.js";
import { BrainDataBase } from "../db/index.js";

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
  // get validator pubkeys
  const validatorPubkeys = Object.keys(brainDb.getData());

  // skip if no validator indexes
  if (validatorPubkeys.length === 0) return;

  let secondsToNextEpoch = getSecondsToNextEpoch({
    currentUnixTime: Math.floor(Date.now() / 1000),
    minGenesisTime,
    secondsPerSlot
  });

  let epochFinalized: number;
  let lastEpochFinalized: number;

  try {
    // get the finalized epoch
    epochFinalized = await beaconchainApi.getEpochHeader({ blockId: "finalized" });
    logger.debug(`Epoch finalized: ${epochFinalized}`);

    // get validator indexes
    // TODO: could be a better way to get the indexes? i.e store them in cache or brain DB
    const validatorIndexes = await Promise.all(
      validatorPubkeys.map(
        async (pubkey) => (await beaconchainApi.getStateValidator({ state: "finalized", pubkey })).data.index
      )
    );

    // get only active validators
    const activeValidators = (
      await beaconchainApi.postStateValidators({
        body: {
          ids: validatorIndexes,
          statuses: validatorIndexes.map(() => ValidatorStatus.ACTIVE_ONGOING)
        },
        stateId: "finalized"
      })
    ).data.map((validator) => validator.index);

    if (activeValidators.length === 0) {
      logger.info("No active validators found");
      return;
    }

    // check node health
    const { el_offline, is_syncing } = (await beaconchainApi.getSyncingStatus()).data;
    if (el_offline) {
      throw new Error("EL Node is offline");
    }
    if (is_syncing) {
      throw new Error("Node is syncing");
    }

    // get validators liveness
    const validatorsLiveness = (
      await beaconchainApi.getLiveness({ epoch: epochFinalized.toString(), validatorIndexes })
    ).data;

    // get block attestations
    const validatorsAttestationsRewards = (
      await beaconchainApi.getAttestationsRewards({
        epoch: epochFinalized.toString(),
        pubkeysOrIndexes: validatorIndexes
      })
    ).data.total_rewards;

    // get sync committee rewards
    const validatorsSyncCommitteeRewards = (
      await beaconchainApi.getSyncCommitteeRewards({
        blockId: "finalized",
        validatorIndexesOrPubkeys: validatorIndexes
      })
    ).data;

    // insert performance data
    for (const validatorIndex of validatorIndexes) {
      const liveness = validatorsLiveness.find((liveness) => liveness.index === validatorIndex)?.is_live;
      const attestationsRewards = validatorsAttestationsRewards.find(
        (liveness) => liveness.validator_index === validatorIndex
      );
      const syncCommitteeRewardsStr = validatorsSyncCommitteeRewards.find(
        (liveness) => liveness.validator_index === validatorIndex
      )?.reward;

      if (!liveness || !syncCommitteeRewardsStr || !attestationsRewards) {
        logger.error(
          `Missing data for validator ${validatorIndex}. live: ${liveness}, sync: ${syncCommitteeRewardsStr}, att: ${attestationsRewards}`
        );
        continue;
      }

      await postgresClient.insertPerformanceData({
        validatorIndex: parseInt(validatorIndex),
        epoch: epochFinalized,
        slot: 1, // TODO: how to get the slot?
        liveness,
        blockProposalStatus: BlockProposalStatus.Missed, // TODO: how to get the block proposal status?
        syncCommitteeRewards: parseInt(syncCommitteeRewardsStr),
        attestationsRewards
      });

      return;
    }
  } catch (error) {
    logger.error(`Error occurred: ${error}`);
  }
}

/**
 * Get the seconds to the start of the next epoch based on the current Unix time and the minimum genesis time of the chain.
 *
 * @param {number} currentUnixTime - Current Unix time in seconds.
 * @param {number} minGenesisTime - Minimum genesis time of the chain.
 * @returns {number} - Seconds to the start of the next epoch.
 */
function getSecondsToNextEpoch({
  currentUnixTime,
  minGenesisTime,
  secondsPerSlot
}: {
  currentUnixTime: number;
  minGenesisTime: number;
  secondsPerSlot: number;
}): number {
  const timeDifference = currentUnixTime - minGenesisTime; // Time difference in seconds
  const stlotsSinceGenesis = timeDifference / secondsPerSlot; // Slots since genesis
  const currentEpoch = Math.floor(stlotsSinceGenesis / 32); // Current epoch
  const nextEpochStartSlot = (currentEpoch + 1) * 32; // Slot at the start of the next epoch
  const nextEpochStartTime = nextEpochStartSlot * secondsPerSlot + minGenesisTime; // Time at the start of the next epoch in seconds
  return nextEpochStartTime - currentUnixTime; // Return the difference in seconds
}

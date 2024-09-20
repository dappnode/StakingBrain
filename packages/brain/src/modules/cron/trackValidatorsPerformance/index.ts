import { BeaconchainApi } from "../../apiClients/beaconchain/index.js";
import { PostgresClient } from "../../apiClients/postgres/index.js";
import logger from "../../logger/index.js";
import { BrainDataBase } from "../../db/index.js";
import { insertPerformanceData } from "./insertPerformanceData.js";
import { getAttestationsTotalRewards } from "./getAttestationsTotalRewards.js";
import { getBlockProposalStatusMap } from "./getBlockProposalStatusMap.js";
import { checkNodeHealth } from "./checkNodeHealth.js";
import { getActiveValidatorsLoadedInBrain } from "./getActiveValidatorsLoadedInBrain.js";
import { logPrefix } from "./logPrefix.js";

const MINUTE_IN_SECONDS = 60;

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
  try {
    const epochFinalized = await beaconchainApi.getEpochHeader({ blockId: "finalized" });
    let newEpochFinalized = epochFinalized;

    while (epochFinalized === newEpochFinalized) {
      try {
        logger.debug(`${logPrefix}Epoch finalized: ${epochFinalized}`);

        // active validators indexes
        const activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({ beaconchainApi, brainDb });
        if (activeValidatorsIndexes.length === 0) {
          logger.info(`${logPrefix}No active validators found`);
          return;
        }
        logger.debug(`${logPrefix}Active validators: ${activeValidatorsIndexes}`);

        // check node health
        await checkNodeHealth({ beaconchainApi });

        // get block attestations rewards
        const validatorsAttestationsRewards = await getAttestationsTotalRewards({
          beaconchainApi,
          epoch: epochFinalized.toString(),
          validatorIndexes: activeValidatorsIndexes
        });
        logger.debug(`${logPrefix}Attestations rewards: ${JSON.stringify(validatorsAttestationsRewards)}`);

        // get block proposal status
        const validatorBlockStatus = await getBlockProposalStatusMap({
          beaconchainApi,
          epoch: epochFinalized.toString(),
          validatorIndexes: activeValidatorsIndexes
        });
        logger.debug(`${logPrefix}Block proposal status map: ${JSON.stringify([...validatorBlockStatus])}`);

        // insert performance data
        await insertPerformanceData({
          postgresClient,
          validatorIndexes: activeValidatorsIndexes,
          epochFinalized,
          validatorBlockStatus,
          validatorsAttestationsRewards
        });

        logger.debug(`${logPrefix}Performance data inserted for epoch ${epochFinalized}`);
        return;
      } catch (error) {
        logger.error(`${logPrefix}Error occurred: ${error}. Updating epoch finalized and retrying in 1 minute`);

        // skip if the seconds to the next epoch is less than 1 minute
        const secondsToNextEpoch = getSecondsToNextEpoch({ minGenesisTime, secondsPerSlot });
        if (secondsToNextEpoch < MINUTE_IN_SECONDS) {
          logger.warn(
            `${logPrefix}Seconds to the next epoch is less than 1 minute (${secondsToNextEpoch}). Skipping until next epoch`
          );
          return;
        }
        // wait 1 minute without blocking the event loop and update epoch finalized
        newEpochFinalized = await new Promise((resolve) =>
          setTimeout(
            async () => resolve(await beaconchainApi.getEpochHeader({ blockId: "finalized" })),
            MINUTE_IN_SECONDS * 1000
          )
        );
      }
    }

    logger.debug(
      `${logPrefix}Epoch finalized changed: ${newEpochFinalized}, finished tracking performance for epoch ${epochFinalized}`
    );
  } catch (e) {
    logger.error(`${logPrefix}Error in trackValidatorsPerformance: ${e}`);
    return;
  }
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

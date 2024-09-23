import { BeaconchainApi } from "../../apiClients/beaconchain/index.js";
import { PostgresClient } from "../../apiClients/postgres/index.js";
import logger from "../../logger/index.js";
import { BrainDataBase } from "../../db/index.js";
import { insertPerformanceDataNotThrow } from "./insertPerformanceData.js";
import { getAttestationsTotalRewards } from "./getAttestationsTotalRewards.js";
import { setBlockProposalStatusMap } from "./setBlockProposalStatusMap.js";
import { checkNodeHealth } from "./checkNodeHealth.js";
import { getActiveValidatorsLoadedInBrain } from "./getActiveValidatorsLoadedInBrain.js";
import { logPrefix } from "./logPrefix.js";
import { TotalRewards } from "../../apiClients/types.js";
import { BlockProposalStatus } from "../../apiClients/postgres/types.js";
import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { getSecondsToNextEpoch } from "../../../getSecondsToNextEpoch.js";

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
  secondsPerSlot,
  executionClient,
  consensusClient
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  beaconchainApi: BeaconchainApi;
  minGenesisTime: number;
  secondsPerSlot: number;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
}): Promise<void> {
  try {
    const epochFinalized = await beaconchainApi.getEpochHeader({ blockId: "finalized" });
    let errorGettingValidatorData: Error | undefined;
    let newEpochFinalized = epochFinalized;
    let activeValidatorsIndexes: string[] = [];
    let validatorsAttestationsTotalRewards: TotalRewards[] = [];
    let validatorBlockStatusMap: Map<string, BlockProposalStatus> = new Map();

    while (epochFinalized === newEpochFinalized) {
      try {
        logger.debug(`${logPrefix}Epoch finalized: ${epochFinalized}`);

        // active validators indexes
        activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({ beaconchainApi, brainDb });
        if (activeValidatorsIndexes.length === 0) {
          logger.info(`${logPrefix}No active validators found`);
          return;
        }
        logger.debug(`${logPrefix}Active validators: ${activeValidatorsIndexes}`);

        // check node health
        await checkNodeHealth({ beaconchainApi });

        // get block attestations rewards
        validatorsAttestationsTotalRewards = await getAttestationsTotalRewards({
          beaconchainApi,
          epoch: epochFinalized.toString(),
          activeValidatorsIndexes
        });

        // get block proposal status
        validatorBlockStatusMap = await setBlockProposalStatusMap({
          beaconchainApi,
          epoch: epochFinalized.toString(),
          activeValidatorsIndexes
        });

        // update error to undefined if no error occurred in last iteration and break the loop
        errorGettingValidatorData = undefined;
        break;
      } catch (error) {
        logger.error(`${logPrefix}Error occurred: ${error}. Updating epoch finalized and retrying in 1 minute`);
        // update error if an error occurred
        errorGettingValidatorData = error;

        // skip if the seconds to the next epoch is less than 1 minute
        const secondsToNextEpoch = getSecondsToNextEpoch({ minGenesisTime, secondsPerSlot });
        if (secondsToNextEpoch < MINUTE_IN_SECONDS) {
          logger.warn(
            `${logPrefix}Could not get validator data for epoch ${epochFinalized}. Writing error and skipping to next epoch.`
          );
          // TODO: collect report of the staker setup status: el is offline, node is syncing, signer is not up and original error
          // exit the while loop and write the error to the DB
          break;
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
    logger.debug(`${logPrefix}Epoch finalized changed: ${newEpochFinalized}`);

    // insert performance data or each validator
    await insertPerformanceDataNotThrow({
      postgresClient,
      activeValidatorsIndexes,
      epochFinalized,
      validatorBlockStatusMap,
      validatorsAttestationsTotalRewards,
      error: errorGettingValidatorData,
      executionClient,
      consensusClient
    });
    logger.debug(`${logPrefix}Performance data inserted for epoch ${epochFinalized}`);
  } catch (e) {
    logger.error(`${logPrefix}Error in trackValidatorsPerformance: ${e}`);
    return;
  }
}

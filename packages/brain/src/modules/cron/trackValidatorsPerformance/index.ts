import { BeaconchainApi } from "../../apiClients/beaconchain/index.js";
import { PostgresClient } from "../../apiClients/postgres/index.js";
import logger from "../../logger/index.js";
import { BrainDataBase } from "../../db/index.js";
import { insertPerformanceDataNotThrow } from "./insertPerformanceData.js";
import { getAttestationsTotalRewards } from "./getAttestationsTotalRewards.js";
import { getBlockProposalStatusMap } from "./getBlockProposalStatusMap.js";
import { getActiveValidatorsLoadedInBrain } from "./getActiveValidatorsLoadedInBrain.js";
import { logPrefix } from "./logPrefix.js";
import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";

// TODO: at this moment Lighthouse client does not support retrieving:
// - liveness of validator from finalized epoch:
// ```400: BAD_REQUEST: request epoch 79833 is more than one epoch from the current epoch 79835```
// - sync committee rewards:
// ```404: NOT_FOUND: Parent state is not available! MissingBeaconState(0xa9592014ad4aa3d5dcc4ef67b669278a85fb4dbe80f12364f2486444b7db3927)```

/**
 * Cron task that will track validators performance for the epoch finalized and store it in the Postgres DB.
 * If any issue is arisen during the process, it will be retried after 30 seconds. If the issue persists until the epoch
 * finalized changes, the issue will be logged and stored in the DB.
 *
 * @param validatorPubkeys - The pubkeys of the validators to track.
 * @param postgresClient - Postgres client to interact with the DB.
 * @param beaconchainApi - Beaconchain API client to interact with the Beaconchain API.
 * @param executionClient - The execution client to interact with.
 * @param consensusClient - The consensus client to interact with.
 *
 * @throws {Error} If there is an error when updating the latestEpoch in the error handling
 */
export async function trackValidatorsPerformance({
  currentEpoch,
  brainDb,
  postgresClient,
  beaconchainApi,
  executionClient,
  consensusClient
}: {
  currentEpoch: number;
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  beaconchainApi: BeaconchainApi;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
}): Promise<void> {
  let latestEpoch = currentEpoch;

  while (currentEpoch === latestEpoch) {
    try {
      logger.debug(`${logPrefix}Starting to track performance for epoch: ${currentEpoch}`);

      const activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({ beaconchainApi, brainDb });
      if (activeValidatorsIndexes.length === 0) {
        logger.info(`${logPrefix}No active validators found`);
        return; // Exit if no active validators are found
      }

      const { el_offline, is_syncing } = (await beaconchainApi.getSyncingStatus()).data;
      if (is_syncing) {
        logger.debug(`${logPrefix}Node is syncing, skipping epoch ${currentEpoch}`);
        return; // Exit if the node is syncing. Head finalized will change
      }
      if (el_offline) throw new Error("EL Node offline"); // throw error and retry

      const validatorsAttestationsTotalRewards = await getAttestationsTotalRewards({
        beaconchainApi,
        epoch: currentEpoch.toString(),
        activeValidatorsIndexes
      });

      const validatorBlockStatusMap = await getBlockProposalStatusMap({
        beaconchainApi,
        epoch: currentEpoch.toString(),
        activeValidatorsIndexes
      });

      await insertPerformanceDataNotThrow({
        postgresClient,
        activeValidatorsIndexes,
        currentEpoch,
        validatorBlockStatusMap,
        validatorsAttestationsTotalRewards,
        error: undefined,
        executionClient,
        consensusClient
      });

      logger.debug(`${logPrefix}Finished tracking performance for epoch: ${currentEpoch}`);
      return; // Success, exit function
    } catch (e) {
      logger.error(`${logPrefix}Error tracking validator peformance for epoch ${currentEpoch}: ${e}`);
      latestEpoch = await beaconchainApi.getEpochHeader({ blockId: "finalized" });
      if (latestEpoch !== currentEpoch) {
        logger.info(`${logPrefix}Epoch has changed from ${currentEpoch} to ${latestEpoch}, aborting retry.`);
        await insertPerformanceDataNotThrow({
          postgresClient,
          activeValidatorsIndexes: [],
          currentEpoch,
          validatorBlockStatusMap: new Map(),
          validatorsAttestationsTotalRewards: [],
          error: e.message, // Store the error in the DB after all retries are exhausted
          executionClient,
          consensusClient
        });
        return; // Exit after final attempt
      }
      await new Promise((resolve) => setTimeout(resolve, 30 * 1000)); // Wait 30 seconds before retrying
    }
  }
}

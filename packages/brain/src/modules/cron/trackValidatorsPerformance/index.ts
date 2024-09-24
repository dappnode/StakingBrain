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
import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";

const RETRY_WAIT_TIME = 30 * 1000; // 30 seconds wait time before retrying
const MAX_RETRIES = 3;  // Define the maximum number of retries
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
  currentEpoch,
  beaconchainApi,
  executionClient,
  consensusClient
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  currentEpoch: number;
  beaconchainApi: BeaconchainApi;
  minGenesisTime: number;
  secondsPerSlot: number;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
}): Promise<void> {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      logger.debug(`${logPrefix}Starting to track performance for epoch: ${currentEpoch}`);

      const latestEpoch = await beaconchainApi.getEpochHeader({ blockId: 'finalized' });
      if (latestEpoch !== currentEpoch) {
        logger.info(`${logPrefix}Epoch has changed from ${currentEpoch} to ${latestEpoch}, aborting retry.`);
        return;  // Exit if the current finalized epoch is different from the one that we wanted to track with this cron execution
      }

      const activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({ beaconchainApi, brainDb });
      if (activeValidatorsIndexes.length === 0) {
        logger.info(`${logPrefix}No active validators found`);
        return;  // Exit if no active validators are found
      }

      await checkNodeHealth({ beaconchainApi });

      const validatorsAttestationsTotalRewards = await getAttestationsTotalRewards({
        beaconchainApi,
        epoch: currentEpoch.toString(),
        activeValidatorsIndexes
      });

      const validatorBlockStatusMap = await setBlockProposalStatusMap({
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
      return;  // Success, exit function
    } catch (e) {
      attempts++;
      logger.error(`${logPrefix}Attempt ${attempts} failed: ${e}`);
      if (attempts >= MAX_RETRIES) {
        await insertPerformanceDataNotThrow({
          postgresClient,
          activeValidatorsIndexes: [],
          currentEpoch,
          validatorBlockStatusMap: new Map(),
          validatorsAttestationsTotalRewards: [],
          error: e,  // Store the error in the DB after all retries are exhausted
          executionClient,
          consensusClient
        });
        return;  // Exit after final attempt
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_WAIT_TIME));  // Wait 30 seconds before retrying
    }
  }
}
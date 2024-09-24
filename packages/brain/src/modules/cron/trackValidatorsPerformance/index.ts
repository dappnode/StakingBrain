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

  try {
    logger.debug(`${logPrefix}Starting to track performance for epoch: ${currentEpoch}`);

    const activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({ beaconchainApi, brainDb });
    if (activeValidatorsIndexes.length === 0) {
      logger.info(`${logPrefix}No active validators found`);
      return;
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
  } catch (e) {
    logger.error(`${logPrefix}Error in trackValidatorsPerformance: ${e}`);
    await handlePerformanceDataOnError({
      postgresClient,
      currentEpoch,
      error: e,
      executionClient,
      consensusClient
    });
  }
}

async function handlePerformanceDataOnError({
  postgresClient,
  currentEpoch,
  error,
  executionClient,
  consensusClient
}: {
  postgresClient: PostgresClient;
  currentEpoch: number;
  error: Error;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
}): Promise<void> {
  await insertPerformanceDataNotThrow({
    postgresClient,
    activeValidatorsIndexes: [],
    currentEpoch,
    validatorBlockStatusMap: new Map(),
    validatorsAttestationsTotalRewards: [],
    error,
    executionClient,
    consensusClient
  });
}
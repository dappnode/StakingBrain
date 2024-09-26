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
import { TotalRewards } from "../../apiClients/types.js";

export async function trackValidatorsPerformanceCron({
  brainDb,
  postgresClient,
  beaconchainApi,
  executionClient,
  consensusClient,
  currentEpoch
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  beaconchainApi: BeaconchainApi;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  currentEpoch: number;
}): Promise<void> {
  let errorDetails: Error | undefined = undefined;
  let activeValidatorsIndexes: string[] = [];
  let validatorBlockStatusMap = new Map();
  let validatorsAttestationsTotalRewards: TotalRewards[] = [];

  try {
    logger.debug(`${logPrefix}Starting to track performance for epoch: ${currentEpoch}`);
    activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({ beaconchainApi, brainDb });
    if (activeValidatorsIndexes.length === 0) {
      logger.info(`${logPrefix}No active validators found`);
      return; // Exit if no active validators are found
    }

    const { el_offline, is_syncing } = (await beaconchainApi.getSyncingStatus()).data;
    if (is_syncing) {
      logger.debug(`${logPrefix}Node is syncing, skipping epoch ${currentEpoch}`);
      return; // Exit if the node is syncing. Head finalized will change
    }
    if (el_offline) {
      throw new Error("EL Node offline"); // throw error and retry
    }

    validatorsAttestationsTotalRewards = await getAttestationsTotalRewards({
      beaconchainApi,
      epoch: currentEpoch.toString(),
      activeValidatorsIndexes
    });

    validatorBlockStatusMap = await getBlockProposalStatusMap({
      beaconchainApi,
      epoch: currentEpoch.toString(),
      activeValidatorsIndexes
    });

  } catch (e) {
    logger.error(`${logPrefix}Error tracking validator performance for epoch ${currentEpoch}: ${e}`);
    errorDetails = e; // Capture the error message
  } finally {
    // Always call storeData in the finally block, regardless of success or failure in try block
    await insertPerformanceDataNotThrow({
      postgresClient,
      activeValidatorsIndexes,
      currentEpoch,
      validatorBlockStatusMap,
      validatorsAttestationsTotalRewards,
      error: errorDetails,
      executionClient,
      consensusClient
    });
  }
}

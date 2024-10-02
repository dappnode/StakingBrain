import { BeaconchainApi } from "../../apiClients/beaconchain/index.js";
import { PostgresClient } from "../../apiClients/postgres/index.js";
import logger from "../../logger/index.js";
import { BrainDataBase } from "../../db/index.js";
import { insertPerformanceData } from "./insertPerformanceData.js";
import { getValidatorAttestationsRewards } from "./getValidatorAttestationsRewards.js";
import { getBlockProposalStatusMap } from "./getBlockProposalStatusMap.js";
import { getActiveValidatorsLoadedInBrain } from "./getActiveValidatorsLoadedInBrain.js";
import { logPrefix } from "./logPrefix.js";
import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { IdealRewards, TotalRewards } from "../../apiClients/types.js";
import {
  BlockProposalStatus,
  ValidatorPerformanceError,
  ValidatorPerformanceErrorCode
} from "../../apiClients/postgres/types.js";
import { BeaconchainApiError } from "../../apiClients/beaconchain/error.js";
import { BrainDbError } from "../../db/error.js";
import { ExecutionOfflineError, NodeSyncingError } from "./error.js";
import { DappmanagerApi } from "../../apiClients/index.js";
import { sendValidatorsPerformanceNotifications } from "./sendValidatorsPerformanceNotifications.js";

let lastProcessedEpoch: number | undefined = undefined;
let lastEpochProcessedWithError = false;

export async function trackValidatorsPerformanceCron({
  brainDb,
  postgresClient,
  beaconchainApi,
  executionClient,
  consensusClient,
  dappmanagerApi,
  sendNotification
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  beaconchainApi: BeaconchainApi;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  dappmanagerApi: DappmanagerApi;
  sendNotification: boolean;
}): Promise<void> {
  try {
    // Get finalized epoch from finality endpoint instead of from header endpoint.
    // The header endpoint might jump two epochs in one call (due to missed block proposals), which would cause the cron to skip an epoch.
    const currentEpoch = parseInt(
      (
        await beaconchainApi.getStateFinalityCheckpoints({
          stateId: "head"
        })
      ).data.finalized.epoch
    );

    // If the current epoch is different from the last processed epoch, or epoch is the same but the last epoch was processed with an error
    // then fetch and insert the performance data
    if (currentEpoch !== lastProcessedEpoch || lastEpochProcessedWithError) {
      await fetchAndInsertPerformanceCron({
        brainDb,
        postgresClient,
        beaconchainApi,
        executionClient,
        consensusClient,
        currentEpoch,
        dappmanagerApi,
        sendNotification
      });
      lastProcessedEpoch = currentEpoch;
    }
  } catch (error) {
    logger.error(`Failed to fetch or process epoch:`, error);
  }
}

export async function fetchAndInsertPerformanceCron({
  brainDb,
  postgresClient,
  beaconchainApi,
  executionClient,
  consensusClient,
  currentEpoch,
  dappmanagerApi,
  sendNotification
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  beaconchainApi: BeaconchainApi;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  currentEpoch: number;
  dappmanagerApi: DappmanagerApi;
  sendNotification: boolean;
}): Promise<void> {
  let validatorPerformanceError: ValidatorPerformanceError | undefined;
  let activeValidatorsIndexes: string[] = [];
  let validatorBlockStatusMap: Map<string, BlockProposalStatus> | undefined;
  let validatorAttestationsRewards: { totalRewards: TotalRewards[]; idealRewards: IdealRewards } | undefined;

  try {
    logger.debug(`${logPrefix}Starting to track performance for epoch: ${currentEpoch}`);

    activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({ beaconchainApi, brainDb });
    if (activeValidatorsIndexes.length === 0) {
      logger.info(`${logPrefix}No active validators found`);
      return; // Exit if no active validators are found
    }

    const { el_offline, is_syncing } = (await beaconchainApi.getSyncingStatus()).data;
    if (is_syncing) throw new NodeSyncingError("Node is syncing");
    if (el_offline) throw new ExecutionOfflineError("Execution layer is offline");

    validatorBlockStatusMap = await getBlockProposalStatusMap({
      beaconchainApi,
      epoch: currentEpoch.toString(),
      activeValidatorsIndexes
    });

    validatorAttestationsRewards = await getValidatorAttestationsRewards({
      beaconchainApi,
      epoch: currentEpoch.toString(),
      activeValidatorsIndexes
    });

    validatorPerformanceError = undefined; // Reset error details
    lastEpochProcessedWithError = false;
  } catch (e) {
    logger.error(`${logPrefix}Error tracking validator performance for epoch ${currentEpoch}: ${e}`);
    validatorPerformanceError = getValidatorPerformanceError(e);
    lastEpochProcessedWithError = true;
  } finally {
    // Always call storeData in the finally block, regardless of success or failure in try block
    await insertPerformanceData({
      postgresClient,
      activeValidatorsIndexes,
      currentEpoch,
      validatorBlockStatusMap,
      validatorAttestationsRewards,
      error: validatorPerformanceError,
      executionClient,
      consensusClient
    });

    // Send notifications if the last epoch was processed without an error
    if (!lastEpochProcessedWithError)
      await sendValidatorsPerformanceNotifications({
        sendNotification,
        dappmanagerApi,
        currentEpoch: currentEpoch.toString(),
        validatorBlockStatusMap,
        validatorAttestationsRewards
      });
  }
}

function getValidatorPerformanceError(e: Error): ValidatorPerformanceError {
  if (e instanceof BeaconchainApiError)
    return {
      code: ValidatorPerformanceErrorCode.BEACONCHAIN_API_ERROR,
      message: e.message
    };
  if (e instanceof BrainDbError)
    return {
      code: ValidatorPerformanceErrorCode.BRAINDDB_ERROR,
      message: e.message
    };
  if (e instanceof ExecutionOfflineError)
    return {
      code: ValidatorPerformanceErrorCode.EXECUTION_OFFLINE,
      message: e.message
    };
  if (e instanceof NodeSyncingError)
    return {
      code: ValidatorPerformanceErrorCode.CONSENSUS_SYNCING,
      message: e.message
    };
  return {
    code: ValidatorPerformanceErrorCode.UNKNOWN_ERROR,
    message: e.message
  };
}

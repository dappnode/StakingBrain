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
import { BlockProposalStatus, EpochError, EpochErrorCode } from "../../apiClients/postgres/types.js";
import { BeaconchainApiError } from "../../apiClients/beaconchain/error.js";
import { BrainDbError } from "../../db/error.js";
import { ExecutionOfflineError, NodeSyncingError } from "./error.js";
import { DappmanagerApi } from "../../apiClients/index.js";
import { sendValidatorsPerformanceNotifications } from "./sendValidatorsPerformanceNotifications.js";

let lastProcessedEpoch: number | undefined = undefined;

export async function fetchAndInsertValidatorsPerformanceData({
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
  if (currentEpoch === lastProcessedEpoch) return;

  let validatorPerformanceError: EpochError | undefined;
  let activeValidatorsIndexes: string[] = [];
  let validatorBlockStatusMap: Map<string, BlockProposalStatus> | undefined;
  let validatorAttestationsRewards: { totalRewards: TotalRewards[]; idealRewards: IdealRewards } | undefined;

  try {
    logger.debug(`${logPrefix}Starting to track performance for epoch: ${currentEpoch}`);

    await ensureNodeStatus({ beaconchainApi });

    activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({ beaconchainApi, brainDb });
    if (activeValidatorsIndexes.length === 0) {
      logger.info(`${logPrefix}No active validators found`);
      return; // Exit if no active validators are found
    }

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
    lastProcessedEpoch = currentEpoch; // Update last processed epoch
  } catch (e) {
    logger.warn(`${logPrefix}Error tracking validator performance for epoch ${currentEpoch}: ${e}`);
    validatorPerformanceError = getValidatorPerformanceError(e);
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
    if (sendNotification && !validatorPerformanceError)
      await sendValidatorsPerformanceNotifications({
        dappmanagerApi,
        currentEpoch: currentEpoch.toString(),
        validatorBlockStatusMap,
        validatorAttestationsRewards
      });
  }
}
/**
 * Ensures that the node is not syncing and the execution layer is online.
 * @throws {NodeSyncingError} if the node is syncing
 * @throws {ExecutionOfflineError} if the execution layer is offline
 */
async function ensureNodeStatus({ beaconchainApi }: { beaconchainApi: BeaconchainApi }): Promise<void> {
  const { el_offline, is_syncing } = (await beaconchainApi.getSyncingStatus()).data;
  if (is_syncing) throw new NodeSyncingError("Node is syncing");
  if (el_offline) throw new ExecutionOfflineError("Execution layer is offline");
}

function getValidatorPerformanceError(e: Error): EpochError {
  if (e instanceof BeaconchainApiError)
    return {
      code: EpochErrorCode.BEACONCHAIN_API_ERROR,
      message: e.message
    };
  if (e instanceof BrainDbError)
    return {
      code: EpochErrorCode.BRAINDDB_ERROR,
      message: e.message
    };
  if (e instanceof ExecutionOfflineError)
    return {
      code: EpochErrorCode.EXECUTION_OFFLINE,
      message: e.message
    };
  if (e instanceof NodeSyncingError)
    return {
      code: EpochErrorCode.CONSENSUS_SYNCING,
      message: e.message
    };
  return {
    code: EpochErrorCode.UNKNOWN_ERROR,
    message: e.message
  };
}

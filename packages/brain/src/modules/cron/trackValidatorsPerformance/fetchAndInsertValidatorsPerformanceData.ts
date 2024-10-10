// Internal
import { sendValidatorsPerformanceNotifications } from "./sendValidatorsPerformanceNotifications.js";
import { logPrefix } from "./logPrefix.js";
import { setValidatorAttestationsRewards } from "./setValidatorAttestationsRewards.js";
import { setBlockProposalStatus } from "./setBlockProposalStatus.js";
import { setActiveValidatorsLoadedInBrain } from "./setActiveValidatorsLoadedInBrain.js";
import { ExecutionOfflineError, NodeSyncingError } from "./error.js";
// External
import { BeaconchainApi, PostgresClient, DappmanagerApi } from "../../apiClients/index.js";
import { BrainDbError } from "../../db/error.js";
import logger from "../../logger/index.js";
import { BrainDataBase } from "../../db/index.js";
import { EpochError, EpochErrorCode } from "../../apiClients/postgres/types.js";
import { BeaconchainApiError } from "../../apiClients/beaconchain/error.js";
import type { Clients, ValidatorsDataPerEpochMap } from "../../apiClients/postgres/types.js";

let lastProcessedEpoch: number | undefined = undefined;

export async function fetchAndInsertValidatorsPerformanceData({
  brainDb,
  postgresClient,
  beaconchainApi,
  clients,
  currentEpoch,
  dappmanagerApi,
  sendNotification
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  beaconchainApi: BeaconchainApi;
  clients: Clients;
  currentEpoch: number;
  dappmanagerApi: DappmanagerApi;
  sendNotification: boolean;
}): Promise<void> {
  if (currentEpoch === lastProcessedEpoch) return;

  const validatorsDataPerEpochMap: ValidatorsDataPerEpochMap = new Map();

  try {
    logger.debug(`${logPrefix}Starting to track performance for epoch: ${currentEpoch}`);

    await ensureNodeStatus({ beaconchainApi });

    await setActiveValidatorsLoadedInBrain({
      beaconchainApi,
      brainDb,
      validatorsDataPerEpochMap,
      clients
    });
    if (validatorsDataPerEpochMap.size === 0) {
      logger.info(`${logPrefix}No active validators found`);
      return;
    }

    await setBlockProposalStatus({
      beaconchainApi,
      epoch: currentEpoch.toString(),
      validatorsDataPerEpochMap
    });

    await setValidatorAttestationsRewards({
      beaconchainApi,
      epoch: currentEpoch.toString(),
      validatorsDataPerEpochMap
    });

    // Update last processed epoch
    lastProcessedEpoch = currentEpoch;
    // everything went well, reset the error in each validator from the map
    validatorsDataPerEpochMap.forEach((value) => {
      value.error = undefined;
    });
  } catch (e) {
    logger.warn(`${logPrefix}Error tracking validator performance for epoch ${currentEpoch}: ${e}`);
    // update errors in each validator from the map
    const error = getValidatorEpochDataError(e);
    validatorsDataPerEpochMap.forEach((value) => {
      value.error = error;
    });
  } finally {
    // Always call storeData in the finally block, regardless of success or failure in try block
    await postgresClient.insertValidatorDataPerEpoch(currentEpoch, validatorsDataPerEpochMap);

    // Send notifications if the last epoch was processed without an error
    // TODO: dont send if error otherwise we will send the same error multiple times
    if (sendNotification)
      await sendValidatorsPerformanceNotifications({
        dappmanagerApi,
        currentEpoch: currentEpoch.toString(),
        validatorsDataPerEpochMap
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

function getValidatorEpochDataError(e: Error): EpochError {
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

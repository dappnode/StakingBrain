import { ExecutionClient, ConsensusClient } from "@stakingbrain/common";
import { PostgresClient, BeaconchainApi, DappmanagerApi } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { fetchAndInsertValidatorsPerformanceData } from "./fetchAndInsertValidatorsPerformanceData.js";

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

    await fetchAndInsertValidatorsPerformanceData({
      brainDb,
      postgresClient,
      beaconchainApi,
      clients: {
        execution: executionClient,
        consensus: consensusClient
      },
      currentEpoch,
      dappmanagerApi,
      sendNotification
    });
  } catch (error) {
    logger.error(`Failed to fetch or process epoch:`, error);
  }
}

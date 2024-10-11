import { ExecutionClient, ConsensusClient } from "@stakingbrain/common";
import { PostgresClient, BeaconchainApi, DappmanagerApi, PrometheusApi } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { fetchAndInsertEpochValidatorsData } from "./fetchAndInsertEpochValidatorsData.js";

let dbInitialized = false;

export async function trackEpochValidatorsDataCron({
  brainDb,
  postgresClient,
  beaconchainApi,
  executionClient,
  consensusClient,
  dappmanagerApi,
  prometheusApi,
  sendNotification
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
  beaconchainApi: BeaconchainApi;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  dappmanagerApi: DappmanagerApi;
  prometheusApi: PrometheusApi;
  sendNotification: boolean;
}): Promise<void> {
  try {
    if (!dbInitialized) {
      await postgresClient.initialize();
      dbInitialized = true;
    }

    // Get finalized epoch from finality endpoint instead of from header endpoint.
    // The header endpoint might jump two epochs in one call (due to missed block proposals), which would cause the cron to skip an epoch.
    const currentEpoch = parseInt(
      (
        await beaconchainApi.getStateFinalityCheckpoints({
          stateId: "head"
        })
      ).data.finalized.epoch
    );

    await fetchAndInsertEpochValidatorsData({
      brainDb,
      postgresClient,
      beaconchainApi,
      clients: {
        execution: executionClient,
        consensus: consensusClient
      },
      currentEpoch,
      dappmanagerApi,
      prometheusApi,
      sendNotification
    });
  } catch (error) {
    logger.error(`Failed to fetch or process epoch:`, error);
  }
}

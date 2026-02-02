import { CronJob } from "./cron.js";
import { reloadValidators } from "./reloadValidators/index.js";
import { trackEpochValidatorsDataCron as trackValidatorsPerformanceCron } from "./trackValidatorsPerformance/index.js";
import { ChainConfig } from "../config/types.js";
import { BrainDataBase } from "../db/index.js";
import { Web3SignerApi } from "../apiClients/signer/index.js";
import { ValidatorApi } from "../apiClients/validator/index.js";
import { PrometheusApi } from "../apiClients/prometheus/index.js";
import { PostgresClient } from "../apiClients/postgres/index.js";
import { BeaconchainApi } from "../apiClients/beaconchain/index.js";
import { DappmanagerApi } from "../apiClients/dappmanager/index.js";

export const getCrons = ({
  sendNotification,
  postgresClient,
  prometheusApi,
  signerApi,
  signerUrl,
  validatorApi,
  brainDb,
  chainConfig,
  beaconchainApi,
  dappmanagerApi
}: {
  sendNotification: boolean;
  postgresClient: PostgresClient;
  prometheusApi: PrometheusApi;
  signerApi: Web3SignerApi;
  signerUrl: string;
  validatorApi: ValidatorApi;
  brainDb: BrainDataBase;
  chainConfig: ChainConfig;
  beaconchainApi: BeaconchainApi;
  dappmanagerApi: DappmanagerApi;
}) => {
  const { executionClient, consensusClient, secondsPerSlot, slotsPerEpoch } = chainConfig;
  return {
    // execute the performance cron task every 1/4 of an epoch
    trackValidatorsPerformanceCronTask: new CronJob(((slotsPerEpoch * secondsPerSlot) / 4) * 1000, async () => {
      await trackValidatorsPerformanceCron({
        brainDb,
        postgresClient,
        beaconchainApi,
        executionClient,
        consensusClient,
        dappmanagerApi,
        prometheusApi,
        sendNotification
      });
    }),
    reloadValidatorsCronTask: new CronJob(60 * 1000, () =>
      reloadValidators(signerApi, signerUrl, validatorApi, beaconchainApi, brainDb)
    )
  };
};

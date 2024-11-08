import { BlockExplorerApi } from "../apiClients/blockExplorer/index.js";
import { PostgresClient } from "../apiClients/postgres/index.js";
import { Web3SignerApi } from "../apiClients/signer/index.js";
import { ValidatorApi } from "../apiClients/validator/index.js";
import { BrainConfig } from "../config/types.js";
import { startUiServer } from "./ui/index.js";
import { startBrainApi } from "./brain/index.js";
import { BrainDataBase } from "../db/index.js";
import { BeaconchainApi } from "../apiClients/beaconchain/index.js";
import { CronJob } from "../cron/cron.js";
import { startLaunchpadApi } from "./launchpad/index.js";
import http from "http";

export const getServers = ({
  brainConfig,
  uiBuildPath,
  signerApi,
  blockExplorerApi,
  postgresClient,
  validatorApi,
  beaconchainApi,
  brainDb,
  reloadValidatorsCronTask,
  allowedOriginsFromEnv
}: {
  brainConfig: BrainConfig;
  uiBuildPath: string;
  signerApi: Web3SignerApi;
  blockExplorerApi: BlockExplorerApi;
  postgresClient: PostgresClient;
  validatorApi: ValidatorApi;
  beaconchainApi: BeaconchainApi;
  brainDb: BrainDataBase;
  reloadValidatorsCronTask: CronJob;
  allowedOriginsFromEnv: string[] | null;
}): {
  uiServer: http.Server;
  launchpadServer: http.Server;
  brainApiServer: http.Server;
} => {
  return {
    uiServer: startUiServer({
      brainConfig,
      uiBuildPath,
      brainDb,
      reloadValidatorsCronTask,
      signerApi,
      validatorApi,
      blockExplorerApi,
      beaconchainApi,
      postgresClient,
      allowedOriginsFromEnv
    }),
    launchpadServer: startLaunchpadApi({
      brainDb,
      signerApi,
      validatorApi,
      beaconchainApi,
      reloadValidatorsCronTask,
      network: brainConfig.chain.network,
      signerUrl: brainConfig.apis.signerUrl,
      allowedOriginsFromEnv
    }),
    brainApiServer: startBrainApi({
      brainDb,
      allowedOriginsFromEnv
    })
  };
};

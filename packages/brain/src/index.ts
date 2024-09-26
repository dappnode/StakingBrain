import path from "path";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";
import {
  Web3SignerApi,
  BeaconchainApi,
  BlockExplorerApi,
  ValidatorApi,
  DappnodeSignatureVerifier
} from "./modules/apiClients/index.js";
import { startUiServer, startLaunchpadApi } from "./modules/apiServers/index.js";
import * as dotenv from "dotenv";
import process from "node:process";
import { params } from "./params.js";
import {
  CronJob,
  reloadValidators,
  trackValidatorsPerformanceCron,
  sendProofsOfValidation
} from "./modules/cron/index.js";
import { PostgresClient } from "./modules/apiClients/index.js";
import { brainConfig } from "./modules/config/index.js";

logger.info(`Starting brain...`);

dotenv.config();
export const mode = process.env.NODE_ENV || "development";
logger.debug(`Running app in mode: ${mode}`);

export const __dirname = process.cwd();

// Load staker config
export const {
  network,
  executionClient,
  consensusClient,
  isMevBoostSet,
  executionClientUrl,
  validatorUrl,
  blockExplorerUrl,
  beaconchainUrl,
  signerUrl,
  token,
  host,
  shareDataWithDappnode,
  validatorsMonitorUrl,
  shareCronInterval,
  postgresUrl,
  minGenesisTime,
  secondsPerSlot,
  slotsPerEpoch,
  tlsCert
} = brainConfig();
logger.debug(
  `Loaded staker config:\n  - Network: ${network}\n  - Execution client: ${executionClient}\n  - Consensus client: ${consensusClient}\n  - Execution client url: ${executionClientUrl}\n  - Validator url: ${validatorUrl}\n  - Beaconcha url: ${blockExplorerUrl}\n  - Beaconchain url: ${beaconchainUrl}\n  - Signer url: ${signerUrl}\n  - Token: ${token}\n  - Host: ${host}}\n  - Postgres url: ${postgresUrl}\n}`
);

// Create API instances. Must preceed db initialization
export const signerApi = new Web3SignerApi(
  {
    baseUrl: signerUrl,
    authToken: token,
    host
  },
  network
);
export const blockExplorerApi = new BlockExplorerApi({ baseUrl: blockExplorerUrl }, network);
export const validatorApi = new ValidatorApi(
  {
    baseUrl: validatorUrl,
    authToken: token,
    tlsCert
  },
  network
);
export const beaconchainApi = new BeaconchainApi({ baseUrl: beaconchainUrl }, network);
export const dappnodeSignatureVerifierApi = new DappnodeSignatureVerifier(network, validatorsMonitorUrl);

// Create DB instance
export const brainDb = new BrainDataBase(
  mode === "production" ? path.resolve("data", params.brainDbName) : params.brainDbName
);

// Create postgres client
const postgresClient = new PostgresClient(postgresUrl);
await postgresClient.initialize().catch((err) => logger.error(`Error initializing table in postgres db`, err)); // TODO: handle error. Consider attempting to initialize on every cron iteration

// Start server APIs
const uiServer = startUiServer(path.resolve(__dirname, params.uiBuildDirName), network);
const launchpadServer = startLaunchpadApi();

await brainDb.initialize(signerApi, validatorApi);
logger.debug(brainDb.data);

// CRON
export const reloadValidatorsCron = new CronJob(60 * 1000, () =>
  reloadValidators(signerApi, signerUrl, validatorApi, brainDb)
);
reloadValidatorsCron.start();
const proofOfValidationCron = new CronJob(shareCronInterval, () =>
  sendProofsOfValidation(signerApi, brainDb, dappnodeSignatureVerifierApi, shareDataWithDappnode)
);
proofOfValidationCron.start();

// execute the performance cron task every 1/4 of an epoch
export const trackValidatorsPerformanceCronTask = new CronJob((slotsPerEpoch * secondsPerSlot) / 4 * 1000, async ()  => {
  await trackValidatorsPerformanceCron({
    brainDb,
    postgresClient,
    beaconchainApi,
    executionClient,
    consensusClient
  });
});
trackValidatorsPerformanceCronTask.start();

// Graceful shutdown
function handle(signal: string): void {
  logger.info(`${signal} received. Shutting down...`);
  reloadValidatorsCron.stop();
  proofOfValidationCron.stop();
  trackValidatorsPerformanceCronTask.stop();
  brainDb.close();
  postgresClient.close().catch((err) => logger.error(`Error closing postgres client`, err)); // postgresClient db connection is the only external resource that needs to be closed
  uiServer.close();
  launchpadServer.close();
  logger.debug(`Stopped all cron jobs and closed all connections.`);
  process.exit(0);
}

process.on("SIGTERM", () => handle("SIGTERM"));
process.on("SIGINT", () => handle("SIGINT"));
process.on("SIGQUIT", () => handle("SIGQUIT"));

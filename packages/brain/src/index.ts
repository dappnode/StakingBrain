import path from "path";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";
import { getApiClients } from "./modules/apiClients/index.js";
import { getServers } from "./modules/apiServers/index.js";
import * as dotenv from "dotenv";
import process from "node:process";
import { params } from "./params.js";
import { getCrons } from "./modules/cron/index.js";
import { brainConfig } from "./modules/config/index.js";

logger.info(`Starting brain...`);

dotenv.config();
const mode = process.env.NODE_ENV || "development";
logger.debug(`Running app in mode: ${mode}`);

const __dirname = process.cwd();

// Load staker config
const config = brainConfig();
logger.debug(`Brain config:\n`);
for (const [key, value] of Object.entries(config)) logger.debug(`${key}: ${value}`);

// Create API instances. Must preceed db initialization
const { prometheusApi, signerApi, blockExplorerApi, validatorApi, beaconchainApi, dappmanagerApi, postgresClient } =
  getApiClients(config);

// Create DB instance
const brainDb = new BrainDataBase(
  mode === "production" ? path.resolve("data", params.brainDbName) : params.brainDbName
);

await brainDb.initialize(signerApi, validatorApi);
logger.debug(brainDb.data);

// CRON
const { trackValidatorsPerformanceCronTask, reloadValidatorsCronTask } = getCrons({
  sendNotification: true,
  postgresClient,
  prometheusApi,
  signerApi,
  signerUrl: config.apis.signerUrl,
  validatorApi,
  brainDb,
  chainConfig: config.chain,
  beaconchainApi,
  dappmanagerApi
});
reloadValidatorsCronTask.start();
trackValidatorsPerformanceCronTask.start();

// Start server APIs
const { uiServer, launchpadServer, brainApiServer } = getServers({
  brainConfig: config,
  uiBuildPath: path.resolve(__dirname, params.uiBuildDirName),
  signerApi,
  blockExplorerApi,
  postgresClient,
  validatorApi,
  beaconchainApi,
  brainDb,
  reloadValidatorsCronTask
});

// Graceful shutdown
function handle(signal: string): void {
  logger.info(`${signal} received. Shutting down...`);
  reloadValidatorsCronTask.stop();
  trackValidatorsPerformanceCronTask.stop();
  brainDb.close();
  postgresClient.close().catch((err) => logger.error(`Error closing postgres client`, err)); // postgresClient db connection is the only external resource that needs to be closed
  uiServer.close();
  launchpadServer.close();
  brainApiServer.close();
  logger.debug(`Stopped all cron jobs and closed all connections.`);
  process.exit(0);
}

process.on("SIGTERM", () => handle("SIGTERM"));
process.on("SIGINT", () => handle("SIGINT"));
process.on("SIGQUIT", () => handle("SIGQUIT"));

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
import { importBuilderIds } from "./modules/config/importBuilderIds.js";

logger.info(`Starting brain...`);

dotenv.config();
const mode = process.env.NODE_ENV || "development";
logger.debug(`Running app in mode: ${mode}`);

const __dirname = process.cwd();

// Load staker config
const config = brainConfig();
logger.debug(`Chain config: ${JSON.stringify(config.chain)}`);

// Create API instances. Must preceed db initialization
const { prometheusApi, signerApi, blockExplorerApi, validatorApi, beaconchainApi, dappmanagerApi, postgresClient } =
  getApiClients(config);

// Create DB instance
const brainDbPath = mode === "production" ? path.resolve("data", params.brainDbName) : params.brainDbName;
const brainDb = new BrainDataBase(brainDbPath);

await brainDb.initialize(signerApi, validatorApi);
logger.debug(`Loaded ${Object.keys(brainDb.getData()).length} validators`);

// Import builder choices once before cron/API writes can begin.
try {
  const imported = importBuilderIds({
    builderIds: process.env.BUILDER_IDS,
    network: config.chain.network,
    brainDb,
    markerPath: path.join(path.dirname(brainDbPath), "builder-config-imported")
  });
  if (imported)
    logger.info(`Builder settings imported: ${imported.imported} validators; ${imported.skipped} preserved`);
} catch (error) {
  // A failed optional handoff must not interrupt ordinary key/fee reconciliation.
  logger.error("Unable to import BUILDER_IDS; import will retry at next startup", error);
}

// CRON
const { reloadValidatorsCronTask } = getCrons({
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
//trackValidatorsPerformanceCronTask.start();

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
  reloadValidatorsCronTask,
  allowedOriginsFromEnv: config.apis.cors
});

// Graceful shutdown
function handle(signal: string): void {
  logger.info(`${signal} received. Shutting down...`);
  reloadValidatorsCronTask.stop();
  //trackValidatorsPerformanceCronTask.stop();
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

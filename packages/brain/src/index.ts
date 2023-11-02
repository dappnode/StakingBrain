import path from "path";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";
import { loadStakerConfig } from "./modules/envs/index.js";
import { Web3SignerApi } from "./modules/apiClients/web3signer/index.js";
import { Beaconchain } from "./modules/apiClients/beaconchain/index.js";
import { BeaconchaApi } from "./modules/apiClients/beaconcha/index.js";
import { startUiServer } from "./modules/apiServers/ui/index.js";
import { startLaunchpadApi } from "./modules/apiServers/launchpad/index.js";
import { ValidatorApi } from "./modules/apiClients/validator/index.js";
import * as dotenv from "dotenv";
import process from "node:process";
import { params } from "./params.js";
import { Cron } from "./modules/cron/index.js";

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
  executionClientUrl,
  validatorUrl,
  beaconchaUrl,
  beaconchainUrl,
  signerUrl,
  token,
  host,
  defaultFeeRecipient,
  tlsCert,
} = loadStakerConfig();
logger.debug(
  `Loaded staker config:\n  - Network: ${network}\n  - Execution client: ${executionClient}\n  - Consensus client: ${consensusClient}\n  - Execution client url: ${executionClientUrl}\n  - Validator url: ${validatorUrl}\n  - Beaconcha url: ${beaconchaUrl}\n  - Beaconchain url: ${beaconchainUrl}\n  - Signer url: ${signerUrl}\n  - Token: ${token}\n  - Host: ${host}\n  - Default fee recipient: ${defaultFeeRecipient}`
);

// Create API instances. Must preceed db initialization
export const signerApi = new Web3SignerApi({
  baseUrl: signerUrl,
  authToken: token,
  host,
});
export const beaconchaApi = new BeaconchaApi({ baseUrl: beaconchaUrl });
export const validatorApi = new ValidatorApi({
  baseUrl: validatorUrl,
  authToken: token,
  tlsCert,
});
export const beaconchainApi = new Beaconchain(
  { baseUrl: beaconchainUrl },
  network
);

// Create DB instance
export const brainDb = new BrainDataBase(
  mode === "production"
    ? path.resolve("data", params.brainDbName)
    : params.brainDbName
);

// Start server APIs
const uiServer = startUiServer(path.resolve(__dirname, params.uiBuildDirName));
const launchpadServer = startLaunchpadApi();

await brainDb.initialize(signerApi, validatorApi, defaultFeeRecipient);
logger.debug(brainDb.data);

// CRON
export const cron = new Cron(
  60 * 1000,
  signerApi,
  signerUrl,
  validatorApi,
  brainDb
);
cron.start();

// Graceful shutdown
function handle(signal: string): void {
  logger.info(`${signal} received. Shutting down...`);
  cron.stop();
  brainDb.close();
  uiServer.close();
  launchpadServer.close();
  process.exit(0);
}

process.on("SIGTERM", () => handle("SIGTERM"));
process.on("SIGINT", () => handle("SIGINT"));
process.on("SIGQUIT", () => handle("SIGQUIT"));

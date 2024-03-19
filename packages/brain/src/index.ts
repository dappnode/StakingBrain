import path from "path";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";
import { loadStakerConfig } from "./modules/envs/index.js";
import {
  Web3SignerApi,
  Beaconchain,
  BeaconchaApi,
  ValidatorApi,
  DappnodeSigningProover,
} from "./modules/apiClients/index.js";
import {
  startUiServer,
  startLaunchpadApi,
} from "./modules/apiServers/index.js";
import * as dotenv from "dotenv";
import process from "node:process";
import { params } from "./params.js";
import {
  CronJob,
  ReloadValidators,
  ProofOfAttestation,
} from "./modules/cron/index.js";

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
  beaconchaUrl,
  beaconchainUrl,
  signerUrl,
  token,
  host,
  tlsCert,
} = loadStakerConfig();
logger.debug(
  `Loaded staker config:\n  - Network: ${network}\n  - Execution client: ${executionClient}\n  - Consensus client: ${consensusClient}\n  - Execution client url: ${executionClientUrl}\n  - Validator url: ${validatorUrl}\n  - Beaconcha url: ${beaconchaUrl}\n  - Beaconchain url: ${beaconchainUrl}\n  - Signer url: ${signerUrl}\n  - Token: ${token}\n  - Host: ${host}}`
);

// Create API instances. Must preceed db initialization
export const signerApi = new Web3SignerApi(
  {
    baseUrl: signerUrl,
    authToken: token,
    host,
  },
  network
);
export const beaconchaApi = new BeaconchaApi(
  { baseUrl: beaconchaUrl },
  network
);
export const validatorApi = new ValidatorApi(
  {
    baseUrl: validatorUrl,
    authToken: token,
    tlsCert,
  },
  network
);
export const beaconchainApi = new Beaconchain(
  { baseUrl: beaconchainUrl },
  network
);
export const dappnodeSignerProoverApi = new DappnodeSigningProover(network);

// Create DB instance
export const brainDb = new BrainDataBase(
  mode === "production"
    ? path.resolve("data", params.brainDbName)
    : params.brainDbName
);

// Start server APIs
const uiServer = startUiServer(
  path.resolve(__dirname, params.uiBuildDirName),
  network
);
const launchpadServer = startLaunchpadApi();

await brainDb.initialize(signerApi, validatorApi);
logger.debug(brainDb.data);

// CRON
export const reloadValidatorsCron = new CronJob(
  60 * 1000,
  new ReloadValidators(
    signerApi,
    signerUrl,
    validatorApi,
    brainDb
  ).reloadValidators
);
reloadValidatorsCron.start();
export const proofOfAttestationCron = new CronJob(
  60 * 60 * 1000,
  new ProofOfAttestation(
    signerApi,
    brainDb,
    dappnodeSignerProoverApi
  ).sendProofOfAttestation
);
proofOfAttestationCron.start();

// Graceful shutdown
function handle(signal: string): void {
  logger.info(`${signal} received. Shutting down...`);
  reloadValidatorsCron.stop();
  proofOfAttestationCron.stop();
  brainDb.close();
  uiServer.close();
  launchpadServer.close();
  process.exit(0);
}

process.on("SIGTERM", () => handle("SIGTERM"));
process.on("SIGINT", () => handle("SIGINT"));
process.on("SIGQUIT", () => handle("SIGQUIT"));

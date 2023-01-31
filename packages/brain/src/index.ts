import path from "path";
import { fileURLToPath } from "url";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";
import { loadStakerConfig } from "./modules/envs/index.js";
import { Web3SignerApi } from "./modules/clientApis/web3signerApi/index.js";
import { BeaconchaApi } from "./modules/clientApis/beaconchaApi/index.js";
import { startUiServer } from "./modules/serverApis/uiApi/index.js";
import { startLaunchpadApi } from "./modules/serverApis/launchpadApi/index.js";
import { job } from "./modules/cron/index.js";

const mode = process.env.NODE_ENV || "development";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
logger.debug(`Running app in mode: ${mode}`);

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
} = loadStakerConfig();
logger.debug(
  `Loaded staker config:\n  - Network: ${network}\n  - Execution client: ${executionClient}\n  - Consensus client: ${consensusClient}\n  - Execution client url: ${executionClientUrl}\n  - Validator url: ${validatorUrl}\n  - Beaconcha url: ${beaconchaUrl}\n  - Beaconchain url: ${beaconchainUrl}\n  - Signer url: ${signerUrl}\n  - Token: ${token}}`
);

// Create API instances. Must preceed db initialization
export const signerApi = new Web3SignerApi({ baseUrl: signerUrl });
export const beaconchaApi = new BeaconchaApi({ baseUrl: beaconchaUrl });
// TODO: add validator and beaconchain APIs instances

// Create DB instance
export const brainDb = new BrainDataBase(`brain-db.json`);
await brainDb.initialize(signerApi).catch((e) => {
  logger.error(e);
  process.exit(1);
});
// TODO: Right after initializing db it should be updated with sources of truth: signer and validator
logger.debug(brainDb.data);

// Start APIs
startUiServer(path.resolve(__dirname, "uiBuild"));
startLaunchpadApi();

// Start cron
job.start();

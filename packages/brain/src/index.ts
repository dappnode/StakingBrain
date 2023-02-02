import path from "path";
import { fileURLToPath } from "url";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";
import { loadStakerConfig } from "./modules/envs/index.js";
import { Web3SignerApi } from "./modules/apiClients/web3signer/index.js";
import { BeaconchaApi } from "./modules/apiClients/beaconcha/index.js";
import { startUiServer } from "./modules/serverApis/uiApi/index.js";
import { startLaunchpadApi } from "./modules/serverApis/launchpadApi/index.js";
import { ValidatorApi } from "./modules/apiClients/validator/index.js";
import { reloadData } from "./modules/cron/index.js";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mode = process.env.NODE_ENV || "development";
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
  host,
  tlsCert,
} = loadStakerConfig();
logger.debug(
  `Loaded staker config:\n  - Network: ${network}\n  - Execution client: ${executionClient}\n  - Consensus client: ${consensusClient}\n  - Execution client url: ${executionClientUrl}\n  - Validator url: ${validatorUrl}\n  - Beaconcha url: ${beaconchaUrl}\n  - Beaconchain url: ${beaconchainUrl}\n  - Signer url: ${signerUrl}\n  - Token: ${token}\n  - Host: ${host}`
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

// Create DB instance
export const brainDb = new BrainDataBase(`brain-db.json`);
await brainDb.initialize(signerApi).catch((e) => {
  logger.error(e);
  process.exit(1);
});
logger.debug(brainDb.data);

// Start APIs
startUiServer(path.resolve(__dirname, "uiBuild"));
startLaunchpadApi();

// Start cron
setInterval(async () => {
  await reloadData();
}, 2000);

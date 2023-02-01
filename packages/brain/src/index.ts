import path from "path";
import { fileURLToPath } from "url";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";
import { loadStakerConfig } from "./modules/envs/index.js";
import { Web3SignerApiClient } from "./modules/apiClients/web3signerApiClient/index.js";
import { BeaconchaApiClient } from "./modules/apiClients/beaconchaApiClient/index.js";
import { startUiServer } from "./modules/serverApis/uiApi/index.js";
import { startLaunchpadApi } from "./modules/serverApis/launchpadApi/index.js";
import { job } from "./modules/cron/index.js";
import { ValidatorApiClient } from "./modules/apiClients/validatorApiClient/index.js";
import { CertFile } from "@stakingbrain/common";

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
  host,
} = loadStakerConfig();
logger.debug(
  `Loaded staker config:\n  - Network: ${network}\n  - Execution client: ${executionClient}\n  - Consensus client: ${consensusClient}\n  - Execution client url: ${executionClientUrl}\n  - Validator url: ${validatorUrl}\n  - Beaconcha url: ${beaconchaUrl}\n  - Beaconchain url: ${beaconchainUrl}\n  - Signer url: ${signerUrl}\n  - Token: ${token} \n  - Host: ${host}`
);

// Create API instances. Must preceed db initialization
export const signerApi = new Web3SignerApiClient({
  baseUrl: signerUrl,
  authToken: token,
  host,
});
export const beaconchaApi = new BeaconchaApiClient({ baseUrl: beaconchaUrl });

const tekuCertFile: CertFile = {
  path: path.resolve(
    __dirname,
    "modules/apiClients/validatorApiClient/security/teku/prater/teku_client_keystore.p12"
  ),
  password: path.resolve(
    __dirname,
    "modules/apiClients/validatorApiClient/security/teku/prater/teku_keystore_password.txt"
  ),
};

export const validatorApi = new ValidatorApiClient({
  baseUrl: validatorUrl,
  authToken: token,
  certFile: consensusClient.includes("teku") ? tekuCertFile : undefined,
});

// beaconchain APIs instances

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
//job.start();

import express from "express";
import cors from "cors";
import logger from "../../logger/index.js";
import http from "node:http";
import { params } from "../../../params.js";
import { corsOptions } from "./config.js";
import { createKeystoresRouter, createFeeRecipientsRouter } from "./routes/index.js";
import { CronJob } from "../../cron/cron.js";
import { BrainDataBase } from "../../db/index.js";
import { Network } from "@stakingbrain/common";
import { BeaconchainApi } from "../../apiClients/beaconchain/index.js";
import { Web3SignerApi } from "../../apiClients/signer/index.js";
import { ValidatorApi } from "../../apiClients/validator/index.js";

export function startLaunchpadApi({
  signerApi,
  validatorApi,
  beaconchainApi,
  reloadValidatorsCronTask,
  brainDb,
  network,
  signerUrl
}: {
  signerApi: Web3SignerApi;
  validatorApi: ValidatorApi;
  beaconchainApi: BeaconchainApi;
  reloadValidatorsCronTask: CronJob;
  brainDb: BrainDataBase;
  network: Network;
  signerUrl: string;
}): http.Server {
  const app = express();
  app.use(express.json());
  app.use(cors(corsOptions));

  app.use(createKeystoresRouter({ reloadValidatorsCronTask, brainDb, network, validatorApi, signerApi, signerUrl }));
  app.use(
    createFeeRecipientsRouter({
      brainDb,
      signerApi,
      validatorApi,
      beaconchainApi,
      reloadValidatorsCronTask
    })
  );

  const server = new http.Server(app);
  server.listen(params.launchpadPort, () => {
    logger.info(`Launchpad API listening on port ${params.launchpadPort}`);
  });

  return server;
}

import express from "express";
import cors from "cors";
import logger from "../../logger/index.js";
import http from "node:http";
import { params } from "../../../params.js";
import { allowedOrigins } from "./config.js";
import { createKeystoresRouter, createFeeRecipientsRouter } from "./routes/index.js";
import { CronJob } from "../../cron/cron.js";
import { BrainDataBase } from "../../db/index.js";
import { Network, RPC_MAX_PAYLOAD_BYTES } from "@stakingbrain/common";
import { Web3SignerApi } from "../../apiClients/signer/index.js";
import { ValidatorApi } from "../../apiClients/validator/index.js";

export function startLaunchpadApi({
  signerApi,
  validatorApi,
  reloadValidatorsCronTask,
  brainDb,
  network,
  signerUrl,
  allowedOriginsFromEnv
}: {
  signerApi: Web3SignerApi;
  validatorApi: ValidatorApi;
  reloadValidatorsCronTask: CronJob;
  brainDb: BrainDataBase;
  network: Network;
  signerUrl: string;
  allowedOriginsFromEnv: string | string[] | null;
}): http.Server {
  const app = express();
  app.use(express.json({ limit: RPC_MAX_PAYLOAD_BYTES, inflate: false }));
  app.use(cors({ origin: allowedOriginsFromEnv ?? allowedOrigins }));

  app.use(
    createKeystoresRouter({
      reloadValidatorsCronTask,
      brainDb,
      network,
      validatorApi,
      signerApi,
      signerUrl
    })
  );
  app.use(
    createFeeRecipientsRouter({
      brainDb,
      signerUrl,
      validatorApi,
      reloadValidatorsCronTask
    })
  );

  const server = new http.Server(app);
  server.listen(params.launchpadPort, () => {
    logger.info(`Launchpad API listening on port ${params.launchpadPort}`);
  });

  return server;
}

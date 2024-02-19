import express from "express";
import cors from "cors";
import logger from "../../logger/index.js";
import http from "node:http";
import { params } from "../../../params.js";
import { corsOptions } from "./config.js";
import { keystoresRouter, feeRecipientsRouter } from "./routes/index.js";

export function startLaunchpadApi(): http.Server {
  const app = express();
  app.use(express.json());
  app.use(cors(corsOptions));

  app.use(keystoresRouter);
  app.use(feeRecipientsRouter);

  const server = new http.Server(app);
  server.listen(params.launchpadPort, () => {
    logger.info(`Launchpad API listening on port ${params.launchpadPort}`);
  });

  return server;
}


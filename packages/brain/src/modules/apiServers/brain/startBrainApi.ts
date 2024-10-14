import express from "express";
import cors from "cors";
import logger from "../../logger/index.js";
import http from "node:http";
import { params } from "../../../params.js";
import { corsOptions } from "./config.js";
import { validatorsRouter } from "./routes/index.js";

export function startBrainApi(): http.Server {
  const app = express();
  app.use(express.json());
  app.use(cors(corsOptions));

  app.use(validatorsRouter);

  const server = new http.Server(app);
  server.listen(params.brainPort, () => {
    logger.info(`Brain API listening on port ${params.brainPort}`);
  });

  return server;
}

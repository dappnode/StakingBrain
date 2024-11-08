import express from "express";
import cors from "cors";
import logger from "../../logger/index.js";
import http from "node:http";
import { params } from "../../../params.js";
import { allowedOrigins } from "./config.js";
import { createBrainValidatorsRouter } from "./routes/index.js";
import { BrainDataBase } from "../../db/index.js";

export function startBrainApi({
  brainDb,
  allowedOriginsFromEnv
}: {
  brainDb: BrainDataBase;
  allowedOriginsFromEnv: string | string[] | null;
}): http.Server {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: allowedOriginsFromEnv ?? allowedOrigins }));

  app.use(createBrainValidatorsRouter({ brainDb }));

  const server = new http.Server(app);
  server.listen(params.brainPort, () => {
    logger.info(`Brain API listening on port ${params.brainPort}`);
  });

  return server;
}

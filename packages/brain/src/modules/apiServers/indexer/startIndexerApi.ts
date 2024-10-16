import express from "express";
import cors from "cors";
import logger from "../../logger/index.js";
import http from "node:http";
import { params } from "../../../params.js";
import { corsOptions } from "./config.js";
import { createIndexerEpochsRouter } from "./routes/index.js";
import { BrainDataBase } from "../../db/index.js";
import { PostgresClient } from "../../apiClients/index.js";

export function startIndexerApi({
  brainDb,
  postgresClient
}: {
  brainDb: BrainDataBase;
  postgresClient: PostgresClient;
}): http.Server {
  const app = express();
  app.use(express.json());
  app.use(cors(corsOptions));

  app.use(createIndexerEpochsRouter({ brainDb, postgresClient }));

  const server = new http.Server(app);
  server.listen(params.indexerPort, () => {
    logger.info(`Indexer API listening on port ${params.indexerPort}`);
  });

  return server;
}

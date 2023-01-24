import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import { testRoute } from "./calls/index.js";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";
import { RpcResponse } from "@stakingbrain/common";
import { RpcPayload, getRpcHandler } from "./modules/rpc/index.js";
import * as routes from "./calls/index.js";

const mode = process.env.NODE_ENV || "development";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
logger.debug(`Running app in mode: ${mode}`);

// DB
const brainDb = new BrainDataBase(`brain-db.json`);
brainDb.initialize();
// TODO: Right after initializing db it should be updated with sources of truth: signer and validator
logger.debug(brainDb.data);

const app = express();
const server = http.createServer(app);

const rpcHandler = getRpcHandler(routes);

// Socket io
const io = new Server(server, {
  serveClient: false,
});
io.on("connection", (socket) => {
  logger.debug("A user connected");
  socket.on(
    "rpc",
    async (rpcPayload: RpcPayload, callback: (res: RpcResponse) => void) => {
      logger.debug(`Received rpc call`);
      logger.debug(rpcPayload);

      if (typeof callback !== "function")
        return logger.error("JSON RPC over WS req without cb");

      rpcHandler(rpcPayload)
        .then(callback)
        .catch((error) => callback({ error }))
        .catch((error) => {
          error.message = `Error on JSON RPC over WS cb: ${error.message}`;
          logger.error(error);
        });
    }
  );
  socket.on("disconnect", () => {
    logger.debug("A user disconnected");
  });
});

// Express
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "build")));
app.get("*", (req, res) => {
  logger.debug("request received");
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

server.listen(80, () => {
  logger.info("Server listening on *:80");
});

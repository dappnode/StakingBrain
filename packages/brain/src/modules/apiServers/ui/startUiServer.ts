import { Network, RpcPayload, RpcResponse } from "@stakingbrain/common";
import cors from "cors";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import logger from "../../logger/index.js";
import { getRpcHandler } from "../../rpc/index.js";
import * as routes from "../../../calls/index.js";
import http from "http";
import { params } from "../../../params.js";

export function startUiServer(uiBuildPath: string, network: Network): http.Server {
  const app = express();
  const server = http.createServer(app);

  const rpcHandler = getRpcHandler(routes);

  // Socket io
  const io = new Server(server, {
    serveClient: false
  });
  io.on("connection", (socket) => {
    logger.debug("A user connected");
    socket.on("rpc", async (rpcPayload: RpcPayload, callback: (res: RpcResponse) => void) => {
      logger.debug(`Received rpc call`);

      // Silent logger for importValidators call (safety reasons and too much noise)
      if (rpcPayload.method === "importValidators") {
        logger.debug(`Call to ${rpcPayload.method} (silent logger)`);
      } else {
        logger.debug(rpcPayload);
      }

      if (typeof callback !== "function") return logger.error("JSON RPC over WS req without cb");

      rpcHandler(rpcPayload)
        .then(callback)
        .catch((error) => callback({ error }))
        .catch((error) => {
          logger.error(`on JSON RPC over WS cb`, error);
        });
    });
    socket.on("disconnect", () => {
      logger.debug("A user disconnected");
    });
  });

  // Express
  const allowedOrigins = [
    "http://my.dappnode",
    `http://brain.web3signer${network === "mainnet" ? "" : "-" + network}.dappnode`
  ];
  app.use(
    cors({
      origin: allowedOrigins
    })
  );
  app.use(express.json());
  app.use(express.static(uiBuildPath));
  app.get("*", (req, res) => {
    logger.debug("request received");
    res.sendFile(path.join(uiBuildPath, "index.html"));
  });

  server.listen(params.uiPort, () => {
    logger.info(`Server listening on *:${params.uiPort}`);
  });

  return server;
}

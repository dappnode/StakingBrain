import { RpcResponse } from "@stakingbrain/common";
import cors from "cors";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import logger from "../../logger/index.js";
import { getRpcHandler, RpcPayload } from "../../rpc/index.js";
import * as routes from "../../../calls/index.js";
import http from "http";

export function startUiServer(uiBuildPath: string): void {
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
  app.use(express.static(uiBuildPath));
  app.get("*", (req, res) => {
    logger.debug("request received");
    res.sendFile(path.join(uiBuildPath, "index.html"));
  });

  server.listen(80, () => {
    logger.info("Server listening on *:80");
  });
}

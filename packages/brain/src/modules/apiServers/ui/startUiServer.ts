import { Network } from "@stakingbrain/common";
import cors from "cors";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import logger from "../../logger/index.js";
import http from "http";
import { params } from "../../../params.js";
import { rpcMethods, RpcMethodNames } from "../../../calls/index.js";

// Define the type for the RPC request
interface RpcRequest {
  jsonrpc: string;
  method: RpcMethodNames;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
  id: string | number | null;
}

export function startUiServer(uiBuildPath: string, network: Network): http.Server {
  const app = express();
  const server = http.createServer(app);

  // Socket io
  const io = new Server(server, {
    serveClient: false
  });
  io.on("connection", (socket) => {
    logger.debug("A user connected");

    socket.on("rpc", async (request: RpcRequest, callback) => {
      const { jsonrpc, method, params, id } = request;
      logger.debug(`Received rpc call: ${method}`);

      if (jsonrpc !== "2.0") {
        callback({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request" },
          id
        });
        return;
      }

      try {
        if (method in rpcMethods) {
          const result = await rpcMethods[method](params);
          callback({ jsonrpc: "2.0", result, id });
        } else throw new Error("Method not found");
      } catch (error) {
        console.error(error);
        callback({
          jsonrpc: "2.0",
          error: { code: -32601, message: error },
          id
        });
      }
    });

    socket.on("disconnect", () => {
      logger.debug("A user disconnected");
    });

    socket.on("error", (error) => {
      logger.error("Socket error", error);
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

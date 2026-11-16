import { Network, VALIDATORS_CHANGED_EVENT } from "@stakingbrain/common";

const VALIDATORS_CHANGED_DEBOUNCE_MS = 500;
import cors from "cors";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import logger from "../../logger/index.js";
import http from "http";
import fs from "fs";
import { params } from "../../../params.js";
import { createRpcHandler } from "./rpcHandler.js";
import { createRpcMethods } from "./calls/index.js";
import { CronJob } from "../../cron/cron.js";
import { BrainDataBase } from "../../db/index.js";
import { BrainConfig } from "../../config/types.js";
import { BeaconchainApi, PostgresClient, ValidatorApi, Web3SignerApi } from "../../apiClients/index.js";
import { allowedOrigins, uiSocketOptions } from "./config.js";

export function startUiServer({
  brainDb,
  beaconchainApi,
  validatorApi,
  signerApi,
  postgresClient,
  uiBuildPath,
  brainConfig,
  reloadValidatorsCronTask,
  allowedOriginsFromEnv,
  port = params.uiPort
}: {
  brainDb: BrainDataBase;
  beaconchainApi: BeaconchainApi;
  validatorApi: ValidatorApi;
  signerApi: Web3SignerApi;
  postgresClient: PostgresClient;
  uiBuildPath: string;
  brainConfig: BrainConfig;
  reloadValidatorsCronTask: CronJob;
  allowedOriginsFromEnv: string | string[] | null;
  /** Defaults to the production UI port; tests pass 0 for an ephemeral port. */
  port?: number;
}): http.Server {
  const { network } = brainConfig.chain;
  // create index.html modified with network
  injectNetworkInHtmmlIfNeeded(uiBuildPath, network);

  // Initialize RPC methods
  const rpcMethods = createRpcMethods({
    postgresClient,
    beaconchainApi,
    validatorApi,
    signerApi,
    brainDb,
    reloadValidatorsCronTask,
    brainConfig
  });

  const app = express();
  const server = http.createServer(app);
  const uiOrigins = allowedOriginsFromEnv ?? allowedOrigins(network);

  // Socket io
  const io = new Server(server, uiSocketOptions(uiOrigins));
  // One import or reload writes several times; coalesce them into a single refresh hint.
  let changeTimer: NodeJS.Timeout | undefined;
  brainDb.onChange(() => {
    if (changeTimer) return;
    changeTimer = setTimeout(() => {
      changeTimer = undefined;
      io.emit(VALIDATORS_CHANGED_EVENT);
    }, VALIDATORS_CHANGED_DEBOUNCE_MS);
    changeTimer.unref();
  });

  io.on("connection", (socket) => {
    logger.debug("A user connected");

    socket.on("rpc", createRpcHandler(rpcMethods));

    socket.on("disconnect", () => {
      logger.debug("A user disconnected");
    });

    socket.on("error", (error) => {
      logger.error("Socket error", error);
    });
  });

  // Express
  app.use(
    cors({
      origin: allowedOriginsFromEnv ?? allowedOrigins(network)
    })
  );
  app.use(express.json({ inflate: false }));
  app.use(express.static(uiBuildPath));
  // path-to-regexp (used by express >=5.0.0) has a breaking change
  // where it does not allow to use wildcard among other characters
  // https://github.com/pillarjs/path-to-regexp?tab=readme-ov-file#errors
  app.get("/", (_, res) => {
    logger.debug("request received");
    res.sendFile(path.join(uiBuildPath, "index.html"));
  });

  server.listen(port, () => {
    logger.info(`Server listening on *:${port}`);
  });

  return server;
}

/**
 * Injects the network value into the index.html file so it can be accessed by the UI
 * Vite does not allow dynamic injection of environment variables once the build is done
 *
 * @param uiBuildPath
 * @param network
 */
function injectNetworkInHtmmlIfNeeded(uiBuildPath: string, network: Network): void {
  const indexHtmlPath = path.join(uiBuildPath, "index.html");

  try {
    // Read the original index.html file synchronously
    const htmlData = fs.readFileSync(indexHtmlPath, "utf8");

    // skip if already has the network set
    if (htmlData.includes("NETWORK")) {
      logger.info("NETWORK value already injected, skipping");
      return;
    }

    // Inject environment variables into the HTML file
    const injectedHtml = htmlData.replace(
      "<head>",
      `<head>
       <script>
         window.env = {
           NETWORK: "${network}"
         };
         console.log("NETWORK value injected:", "${network}");
       </script>`
    );

    // Write the modified HTML back to the file system synchronously
    logger.info(`Writing modified index.html to ${indexHtmlPath}`);
    fs.writeFileSync(indexHtmlPath, injectedHtml, "utf8");
  } catch (err) {
    logger.error("Error processing index.html:", err);
  }
}

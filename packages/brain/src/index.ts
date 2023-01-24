import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import { testRoute } from "./calls/index.js";
import { BrainDataBase } from "./modules/db/index.js";
import logger from "./modules/logger/index.js";

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

// Socket io
const io = new Server(server, {
  serveClient: false,
});
io.on("connection", (socket) => {
  logger.debug("A user connected");
  socket.on("rpc", async (payload, callback) => {
    logger.debug(`Received rpc call ${payload}`);
    const { method } = payload;
    if (method === "testRoute") {
      const result = await testRoute();
      callback({ result });
    }
  });
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

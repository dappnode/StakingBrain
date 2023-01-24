import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import { testRoute } from "./calls/index.js";
import { BrainDataBase } from "./modules/db/index.js";

const mode = process.env.NODE_ENV || "development";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log(`Running app in mode: ${mode}`);

// DB
const brainDb = new BrainDataBase(`brain-db.json`);
brainDb.initialize();
// TODO: Right after initializing db it should be updated with sources of truth: signer and validator
console.debug(brainDb.data);

const app = express();
const server = http.createServer(app);

// Socket io
const io = new Server(server, {
  serveClient: false,
});
io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("rpc", async (payload, callback) => {
    console.log("Received rpc call", payload);
    const { method } = payload;
    if (method === "testRoute") {
      const result = await testRoute();
      callback({ result });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Express
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "build")));
app.get("*", (req, res) => {
  console.log("request received");
  console.log(__dirname);
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

server.listen(80, () => {
  console.log("Server listening on *:80");
});

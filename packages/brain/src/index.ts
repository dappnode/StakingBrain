import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import http from "http";

const mode = process.env.NODE_ENV || "development";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log(`Running app in mode: ${mode}`);

const app = express();
const server = new http.Server(app);

const io = new Server(server, { serveClient: false });

io.on("connection", (socket) => {
  console.log(`Socket connected`, socket.id);

  // JSON RPC over WebSockets
  socket.on(
    "rpc",
    (rpcPayload: RpcPayload, callback: (res: RpcResponse) => void) => {
      if (typeof callback !== "function")
        return console.error("JSON RPC over WS req without cb", rpcPayload);

      callback({ result: rpcPayload });
    }
  );
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "build")));
app.get("*", (req, res) => {
  console.log("request received");
  console.log(__dirname);
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
app.listen(80, () => {
  console.log("server started on port 80");
});

// Utils

// Types
// TODO: check move to common
interface RpcPayload {
  method: string;
  params: Args;
}

type Args = any[];

export interface RpcResponse<R = any> {
  result?: R;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

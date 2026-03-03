import { io, Socket } from "socket.io-client";
import { RoutesArguments, RoutesReturn, RpcMethodNames } from "./types.js";
import { BRAIN_UI_DOMAIN, Network } from "@stakingbrain/common";

function toErrorMessage(value: unknown): string {
  if (value == null) return "Unknown error";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || value.name || "Unknown error";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    // Common JSON-RPC shape: { code, message, data }
    const message = record.message;

    if (typeof message === "string") return message;
    if (message instanceof Error) return message.message || message.name || "Unknown error";

    // In this repo the backend currently sends `message: error` where error can be an object.
    if (message && typeof message === "object") {
      const nested = message as Record<string, unknown>;
      if (typeof nested.message === "string") return nested.message;
      try {
        return JSON.stringify(message);
      } catch {
        return String(message);
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

class RpcClient {
  private socket: Socket;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl, { autoConnect: true });

    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error", error);
    });
  }

  async call<T extends RpcMethodNames>(method: T, params: RoutesArguments[T]): Promise<RoutesReturn[T]> {
    return new Promise((resolve, reject) => {
      const rpcRequest = {
        jsonrpc: "2.0",
        method,
        params,
        id: Date.now()
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.emit("rpc", rpcRequest, (response: any) => {
        if (response.error) {
          const err = new Error(toErrorMessage(response.error));
          // Preserve the raw JSON-RPC error payload for debugging if needed.
          (err as Error & { rpcError?: unknown }).rpcError = response.error;
          reject(err);
        } else {
          resolve(response.result as RoutesReturn[T]);
        }
      });
    });
  }
}

export const rpcClient = new RpcClient(`http://${BRAIN_UI_DOMAIN(window.env?.NETWORK || Network.Hoodi)}:80`);

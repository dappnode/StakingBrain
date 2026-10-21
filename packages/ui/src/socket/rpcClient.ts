import type { Socket } from "socket.io-client";
import { RPC_MAX_PAYLOAD_BYTES, RPC_TIMEOUT_MS } from "@stakingbrain/common";
import type { RoutesArguments, RoutesReturn, RpcMethodNames } from "./types.js";

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

export class RpcClient {
  constructor(private readonly socket: Socket) {
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

      // Socket.IO adds a small packet prefix around the JSON request.
      if (new TextEncoder().encode(JSON.stringify(rpcRequest)).byteLength + 64 > RPC_MAX_PAYLOAD_BYTES) {
        reject(new Error("This request is too large. Select fewer validators or reduce the builder configuration."));
        return;
      }

      this.socket.timeout(RPC_TIMEOUT_MS).emit(
        "rpc",
        rpcRequest,
        (
          error: Error | null,
          response:
            | {
                error?: unknown;
                result?: RoutesReturn[T];
              }
            | undefined
        ) => {
          if (error) {
            reject(
              new Error(
                "Connection lost or request timed out. The request may still be running; refresh status before retrying."
              )
            );
          } else if (!response) {
            reject(new Error("Invalid response from Brain"));
          } else if (response.error) {
            const err = new Error(toErrorMessage(response.error));
            // Preserve the raw JSON-RPC error payload for debugging if needed.
            (err as Error & { rpcError?: unknown }).rpcError = response.error;
            reject(err);
          } else {
            resolve(response.result as RoutesReturn[T]);
          }
        }
      );
    });
  }
}

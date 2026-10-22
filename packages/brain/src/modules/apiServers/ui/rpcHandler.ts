import type { RpcMethods } from "./calls/types.js";
import logger from "../../logger/index.js";

type RpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
};

export function createRpcHandler(rpcMethods: RpcMethods) {
  return async (request: unknown, acknowledgement: unknown): Promise<void> => {
    // A missing acknowledgement must not turn validation failures into unhandled rejections.
    if (typeof acknowledgement !== "function") return;
    const callback = acknowledgement as (response: RpcResponse) => void;
    const record =
      request && typeof request === "object" && !Array.isArray(request) ? (request as Record<string, unknown>) : {};
    const id = typeof record.id === "string" || typeof record.id === "number" ? record.id : null;
    if (
      record.jsonrpc !== "2.0" ||
      typeof record.method !== "string" ||
      (record.id !== undefined && record.id !== null && typeof record.id !== "string" && typeof record.id !== "number")
    ) {
      callback({ jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } });
      return;
    }
    const method = record.method;
    if (!Object.hasOwn(rpcMethods, method)) {
      callback({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
      return;
    }
    logger.debug(`Received rpc call: ${method}`);
    try {
      const result = await rpcMethods[method as keyof RpcMethods](record.params as never);
      callback({ jsonrpc: "2.0", result, id });
    } catch (error) {
      logger.error(error);
      const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
      callback({ jsonrpc: "2.0", id, error: { code: -32000, message } });
    }
  };
}

import { Routes, RpcResponse } from "@stakingbrain/common";

/**
 * Given a set of method handlers, parse a RPC request and handle it
 */
export const getRpcHandler = (methods: Routes) => {
  return async (body: RpcPayload): Promise<RpcResponse> => {
    try {
      const { method, params } = parseRpcRequest(body);

      // Get handler
      const handler = methods[method] as (...params: any[]) => Promise<any>;
      if (!handler) throw new JsonRpcReqError(`Method not found ${method}`);

      const result = await handler(...params);
      return { result };
    } catch (e) {
      if (e instanceof JsonRpcReqError) {
        // JSON RPC request formating errors, do not log
        return { error: { code: e.code, message: e.message } };
      } else {
        return { error: { code: -32603, message: e.message, data: e.stack } };
      }
    }
  };
};

/**
 * Parse RPC request, to be used in the server
 */
function parseRpcRequest(body: RpcPayload): {
  method: keyof Routes;
  params: any[];
} {
  if (typeof body !== "object")
    throw Error(`body request must be an object, ${typeof body}`);
  const { method, params } = body;
  if (!method) throw new JsonRpcReqError("request body missing method");
  if (!params) throw new JsonRpcReqError("request body missing params");
  if (!Array.isArray(params))
    throw new JsonRpcReqError("request body params must be an array");
  return { method: method as keyof Routes, params };
}

function tryToParseRpcRequest(body: any): { method?: string; params?: any[] } {
  try {
    return parseRpcRequest(body);
  } catch {
    return {};
  }
}

/**
 * Errors specific to JSON RPC request payload formating
 */
class JsonRpcReqError extends Error {
  code: number;
  constructor(message?: string, code?: number) {
    super(message);
    this.code = code || -32603;
  }
}

export interface RpcPayload {
  method: string;
  params: Args;
}

type Args = any[];

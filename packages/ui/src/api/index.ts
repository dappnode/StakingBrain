import { parseRpcResponse, Routes, routesData } from "@stakingbrain/common";
import { apiRpc } from "./rpc";
import { mapValues } from "lodash-es";

export async function startApi(): Promise<void> {
  apiRpc.start(
    function onConnect() {
      console.log("SocketIO connected");
      // When Socket.io re-establishes connection check if still logged in
    },
    function onError(errorMessage: string) {
      console.error("SocketIO connection closed", errorMessage);
    }
  );
}

/**
 * Typed API object to perform RPC calls
 */
export const api: Routes = mapValues(
  routesData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data: any, route: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callRoute<any>(route, args)
);

/**
 * Call a RPC route
 * @param route "restartPackage"
 * @param args ["bitcoin.dnp.dappnode.eth"]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callRoute<R>(method: string, params: any[]): Promise<R> {
  const rpcResponse = await apiRpc.call<R>({ method, params });
  return parseRpcResponse(rpcResponse);
}

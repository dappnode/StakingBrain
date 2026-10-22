import { BRAIN_UI_DOMAIN, Network } from "@stakingbrain/common";
import { RPC_MAX_PAYLOAD_BYTES } from "@stakingbrain/common";
import type { ServerOptions } from "socket.io";

export const allowedOrigins = (network: Network) => ["http://my.dappnode", `http://${BRAIN_UI_DOMAIN(network)}`];

export function uiSocketOptions(origins: string | string[]): Partial<ServerOptions> {
  const allowed = Array.isArray(origins) ? origins : [origins];
  return {
    serveClient: false,
    maxHttpBufferSize: RPC_MAX_PAYLOAD_BYTES,
    cors: { origin: origins },
    // CORS alone does not protect WebSocket connections.
    allowRequest: (request, callback) => {
      callback(null, !request.headers.origin || allowed.includes("*") || allowed.includes(request.headers.origin));
    }
  };
}

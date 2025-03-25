import { io, Socket } from "socket.io-client";
import { RoutesArguments, RoutesReturn, RpcMethodNames } from "./types.js";
import { BRAIN_UI_DOMAIN, Network } from "@stakingbrain/common";

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
          reject(response.error);
        } else {
          resolve(response.result as RoutesReturn[T]);
        }
      });
    });
  }
}

export const rpcClient = new RpcClient(`http://${BRAIN_UI_DOMAIN(window.env?.NETWORK || Network.Hoodi)}:80`);

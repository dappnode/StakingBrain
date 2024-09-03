import io from "socket.io-client";
import { IApiRpc, RpcPayload, RpcResponse } from "@stakingbrain/common";

//No need to set the port, because back and front are served in the same port
const socket = io();

export const apiRpc: IApiRpc = {
  async call<R>(payload: RpcPayload) {
    return await new Promise<RpcResponse<R>>((resolve) => {
      socket.emit("rpc", payload, resolve);
    });
  },

  start(onConnect, onError) {
    socket.on("connect", function () {
      onConnect();
    });

    function handleConnectionError(err: Error | string): void {
      const errorMessage = err instanceof Error ? err.message : err;
      onError(errorMessage);
    }

    // Handles server errors
    socket.on("connect_error", handleConnectionError);

    // Handles middleware / authentication errors
    socket.on("error", handleConnectionError);

    // Handles individual socket errors
    socket.on("disconnect", handleConnectionError);
  }
};

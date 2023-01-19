import io, { Socket } from "socket.io-client";

let socketGlobal: Socket | null = null;
let apiStarted = false;
// TODO: take into account network
const socketIoUrl = "http://ui.web3signer-prater.dappnode";

export const apiRpc: IApiRpc = {
  async call<R>(payload: RpcPayload) {
    const socket = setupSocket();
    return await new Promise<RpcResponse<R>>((resolve) => {
      socket.emit("rpc", payload, resolve);
    });
  },

  start(onConnect, onError) {
    // Only run start() once
    if (apiStarted) {
      return;
    } else {
      apiStarted = true;
    }

    const socket = setupSocket();

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
  },
};

function setupSocket(): Socket {
  if (!socketGlobal) {
    /* eslint-disable-next-line no-console */
    console.log("Connecting API with Socket.io to", socketIoUrl);
    socketGlobal = io(socketIoUrl);
  }
  return socketGlobal;
}

// Types

interface RpcPayload {
  method: string;
  params: Args;
}

interface IApiRpc {
  start(onConnect: () => void, onError: (errorMessage: string) => void): void;
  call<R>(payload: RpcPayload): Promise<RpcResponse<R>>;
}

type Args = any[];

interface RpcResponse<R = any> {
  result?: R;
  error?: { code: number; message: string; data?: any };
}

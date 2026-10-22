import { io } from "socket.io-client";
import { BRAIN_UI_DOMAIN, Network } from "@stakingbrain/common";
import { RpcClient } from "./rpcClient.js";

export const rpcClient = new RpcClient(
  io(`http://${BRAIN_UI_DOMAIN(window.env?.NETWORK || Network.Hoodi)}:80`, { autoConnect: true })
);

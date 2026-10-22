import { expect } from "chai";
import http from "node:http";
import { Server } from "socket.io";
import { Network } from "@stakingbrain/common";
import { allowedOrigins, uiSocketOptions } from "../../../src/modules/apiServers/ui/config.js";

describe("UI WebSocket origin checks", () => {
  it("rejects untrusted browser handshakes while allowing the UI and non-browser clients", () => {
    const io = new Server(http.createServer(), uiSocketOptions(allowedOrigins(Network.Mainnet)));
    try {
      // Exercise Engine.IO's real upgrade verification without binding a network port.
      const engine = io.engine as unknown as {
        verify: (request: unknown, upgrade: boolean, callback: (error?: number) => void) => void;
      };
      for (const origin of ["http://my.dappnode", "http://brain.web3signer.dappnode", undefined]) {
        let result: number | undefined = -1;
        engine.verify(
          { method: "GET", headers: { origin }, _query: { transport: "websocket", EIO: "4" } },
          true,
          (error) => {
            result = error;
          }
        );
        expect(result, origin).to.equal(undefined);
      }
      let rejected = false;
      engine.verify(
        {
          method: "GET",
          headers: { origin: "https://untrusted.example" },
          _query: { transport: "websocket", EIO: "4" }
        },
        true,
        (error) => {
          rejected = typeof error === "number";
        }
      );
      expect(rejected).to.equal(true);
    } finally {
      io.close();
    }
  });
});

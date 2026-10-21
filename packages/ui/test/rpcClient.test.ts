import { expect } from "chai";
import sinon from "sinon";
import { Manager, Socket } from "socket.io-client";
import { RPC_MAX_PAYLOAD_BYTES, RPC_TIMEOUT_MS, validateBuilderConfig } from "@stakingbrain/common";
import { RpcClient } from "../src/socket/rpcClient.js";

class TestManager extends Manager {
  connectSocket(): void {
    this.emitReserved("packet", { type: 0, nsp: "/", data: { sid: "test" } });
  }

  acknowledge(id: number, response: unknown): void {
    this.emitReserved("packet", { type: 3, nsp: "/", id, data: [response] });
  }

  closeTransport(): void {
    this.emitReserved("close", "transport close");
  }
}

describe("RPC request lifecycle", () => {
  let clock: sinon.SinonFakeTimers;
  let manager: TestManager;
  let socket: Socket;
  let client: RpcClient;
  let packets: sinon.SinonStub;
  const connect = () => manager.connectSocket();
  const acknowledge = (response: unknown) => manager.acknowledge(packets.lastCall.args[0].id, response);

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    manager = new TestManager("http://unused", { autoConnect: false });
    // Exercise the real Socket.IO acknowledgement lifecycle without opening a network connection.
    sinon.stub(manager, "open").returns(manager);
    packets = sinon.stub(manager, "_packet");
    socket = manager.socket("/");
    socket.connect();
    sinon.stub(console, "log");
    client = new RpcClient(socket);
  });
  afterEach(() => {
    socket.disconnect();
    sinon.restore();
  });

  it("settles successful requests and clears the acknowledgement timer", async () => {
    connect();
    const pending = client.call("updateValidators", [{ pubkey: "0x" + "11".repeat(48), builderConfig: {} }]);
    acknowledge({ result: null });
    expect(await pending).to.equal(null);
    expect(clock.countTimers()).to.equal(0);
  });

  it("preserves server errors", async () => {
    connect();
    const pending = client.call("getValidators", undefined).catch((error: Error) => error);
    acknowledge({ error: { code: -32000, message: "Settings saved; client unavailable" } });
    expect(await pending).to.have.property("message", "Settings saved; client unavailable");
    expect(clock.countTimers()).to.equal(0);
  });

  it("rejects a sent request immediately when the transport disconnects", async () => {
    connect();
    const pending = client.call("getValidators", undefined).catch((error: Error) => error);
    manager.closeTransport();
    expect(await pending)
      .to.have.property("message")
      .that.includes("Connection lost");
    expect(clock.countTimers()).to.equal(0);
  });

  it("times out queued requests and prevents them from being replayed after reconnection", async () => {
    const pending = client.call("getValidators", undefined).catch((error: Error) => error);
    expect(socket.sendBuffer).to.have.length(1);
    await clock.tickAsync(RPC_TIMEOUT_MS);
    expect(await pending)
      .to.have.property("message")
      .that.includes("timed out");
    expect(socket.sendBuffer).to.have.length(0);
    connect();
    expect(packets.called).to.equal(false);
  });

  const largeConfig = {
    builders: Array.from({ length: 64 }, (_, index) => ({
      url: `https://builder-${index}.example`,
      auth_data: "0x" + "ab".repeat(4096)
    }))
  };

  it("sends valid bulk settings larger than the previous one-megabyte limit", async () => {
    validateBuilderConfig(largeConfig);
    connect();
    const pending = client.call(
      "updateValidators",
      ["11", "22"].map((byte) => ({
        pubkey: "0x" + byte.repeat(48),
        builderConfig: largeConfig
      }))
    );
    const bytes = new TextEncoder().encode(JSON.stringify(packets.lastCall.args[0])).byteLength;
    expect(bytes).to.be.greaterThan(1e6).and.lessThan(RPC_MAX_PAYLOAD_BYTES);
    acknowledge({ result: null });
    expect(await pending).to.equal(null);
  });

  it("rejects requests exceeding the server limit before sending them", async () => {
    connect();
    const error = await client
      .call(
        "updateValidators",
        Array.from({ length: 17 }, (_, index) => ({
          pubkey: "0x" + index.toString(16).padStart(96, "0"),
          builderConfig: largeConfig
        }))
      )
      .catch((error: Error) => error);
    expect(error).to.have.property("message").that.includes("too large");
    expect(packets.called).to.equal(false);
    expect(clock.countTimers()).to.equal(0);
  });
});

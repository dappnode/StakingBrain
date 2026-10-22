import { expect } from "chai";
import sinon from "sinon";
import { createRpcHandler } from "../../../src/modules/apiServers/ui/rpcHandler.js";
import type { RpcMethods } from "../../../src/modules/apiServers/ui/calls/types.js";
import logger from "../../../src/modules/logger/index.js";

describe("RPC server dispatch", () => {
  beforeEach(() => {
    sinon.stub(logger, "error");
    sinon.stub(logger, "debug");
  });
  afterEach(() => sinon.restore());

  it("returns validation errors for malformed messages without executing methods", async () => {
    const getValidators = sinon.stub().resolves([]);
    const handler = createRpcHandler({ getValidators } as unknown as RpcMethods);
    for (const request of [
      null,
      undefined,
      [],
      "rpc",
      123,
      {},
      { jsonrpc: "2.0", method: [] },
      { jsonrpc: "2.0", method: "getValidators", id: {} }
    ]) {
      const ack = sinon.stub();
      await handler(request, ack);
      expect(ack.firstCall.args[0].error.code).to.equal(-32600);
    }
    expect(getValidators.called).to.equal(false);
  });

  it("ignores messages with no acknowledgement and rejects inherited method names", async () => {
    const getValidators = sinon.stub().resolves([]);
    const handler = createRpcHandler({ getValidators } as unknown as RpcMethods);
    await handler(null, undefined);
    await handler({ jsonrpc: "2.0", method: "getValidators" }, "not a callback");
    expect(getValidators.called).to.equal(false);
    for (const method of ["toString", "constructor", "__proto__", "missing"]) {
      const ack = sinon.stub();
      await handler({ jsonrpc: "2.0", method, id: 7 }, ack);
      expect(ack.firstCall.args[0]).to.include({ id: 7 });
      expect(ack.firstCall.args[0].error.code).to.equal(-32601);
    }
  });

  it("preserves request IDs, parameters, successful responses and operation failures", async () => {
    const getBuilderConfigs = sinon.stub().resolves([{ pubkey: "test" }]);
    const handler = createRpcHandler({ getBuilderConfigs } as unknown as RpcMethods);
    const ack = sinon.stub();
    const request = { jsonrpc: "2.0", method: "getBuilderConfigs", params: ["key"], id: "request-1" };
    await handler(request, ack);
    expect(getBuilderConfigs.firstCall.args).to.deep.equal([["key"]]);
    expect(ack.firstCall.args[0]).to.deep.equal({ jsonrpc: "2.0", result: [{ pubkey: "test" }], id: request.id });
    getBuilderConfigs.rejects(new Error("Client unavailable"));
    await handler(request, ack);
    expect(ack.lastCall.args[0]).to.deep.equal({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32000, message: "Client unavailable" }
    });
  });
});

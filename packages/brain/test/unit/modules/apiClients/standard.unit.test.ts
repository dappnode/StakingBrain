import { expect } from "chai";
import sinon from "sinon";
import http from "node:http";
import { EventEmitter } from "node:events";
import { Network, RPC_TIMEOUT_MS } from "@stakingbrain/common";
import { StandardApi } from "../../../../src/modules/apiClients/standard.js";

class ApiProbe extends StandardApi {
  read(timeout?: number): Promise<unknown> {
    return this.request({ method: "GET", endpoint: "/test", timeout });
  }
}

describe("HTTP request deadlines", () => {
  let clock: sinon.SinonFakeTimers;
  let request: http.ClientRequest;
  let api: ApiProbe;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    request = new EventEmitter() as http.ClientRequest;
    request.end = sinon.stub();
    request.destroy = sinon.stub().callsFake((error: Error) => {
      request.emit("error", error);
      return request;
    });
    sinon.stub(http, "request").returns(request);
    api = new ApiProbe({ baseUrl: "http://unused" }, Network.Mainnet);
  });
  afterEach(() => sinon.restore());

  it("settles stalled requests at the default deadline and releases timers", async () => {
    const pending = api.read().catch((error: Error) => error);
    await clock.tickAsync(RPC_TIMEOUT_MS);
    expect(await pending)
      .to.have.property("message")
      .that.includes("timed out");
    expect(clock.countTimers()).to.equal(0);
  });

  it("clears the deadline after a successful response", async () => {
    const pending = api.read(1000);
    const response = new EventEmitter() as http.IncomingMessage;
    response.statusCode = 200;
    response.headers = { "content-type": "application/json" };
    request.emit("response", response);
    response.emit("data", Buffer.from('{"ok":true}'));
    response.emit("end");
    expect(await pending).to.deep.equal({ ok: true });
    expect(clock.countTimers()).to.equal(0);
  });
});

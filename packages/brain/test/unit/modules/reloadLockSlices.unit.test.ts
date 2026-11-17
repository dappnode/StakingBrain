import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { inspect } from "node:util";
import { BuilderConfig, featureFlags, Network } from "@stakingbrain/common";
import { BrainDataBase } from "../../../src/modules/db/index.js";
import { CronJob } from "../../../src/modules/cron/cron.js";
import { ValidatorApi, Web3SignerApi } from "../../../src/modules/apiClients/index.js";
import { ApiError } from "../../../src/modules/apiClients/error.js";
import { ValidatorApiError } from "../../../src/modules/apiClients/validator/error.js";
import { updateValidators } from "../../../src/modules/apiServers/ui/calls/updateValidators.js";
import { reloadValidators } from "../../../src/modules/cron/reloadValidators/index.js";
import { postValidatorsFeeRecipientsFromDb } from "../../../src/modules/cron/reloadValidators/postValidatorsFeeRecipientsFromDb.js";
import { postValidatorsBuilderConfigsFromDb } from "../../../src/modules/cron/reloadValidators/postValidatorsBuilderConfigsFromDb.js";
import { RELOAD_SLICE_MAX_HOLD_MS } from "../../../src/modules/cron/reloadValidators/forEachInLockedSlices.js";
import logger from "../../../src/modules/logger/index.js";

const pubkeyAt = (i: number) => "0x" + i.toString(16).padStart(96, "0");
const recipient = "0x" + "ab".repeat(20);
const newRecipient = "0x" + "cd".repeat(20);
const builderConfig: BuilderConfig = { builders: [{ url: "https://builder.example" }] };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Reload holds the validator operation lock in short slices", () => {
  let directory: string;
  let brainDb: BrainDataBase;

  const seed = (count: number, extra: { builderConfig?: BuilderConfig } = {}): string[] => {
    const keys = Array.from({ length: count }, (_, i) => pubkeyAt(i + 1));
    brainDb.addValidators({
      validators: Object.fromEntries(
        keys.map((key) => [key, { tag: "solo" as const, feeRecipient: recipient, automaticImport: false, ...extra }])
      )
    });
    return keys;
  };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-slices-"));
    brainDb = new BrainDataBase(path.join(directory, "db.json"));
    sinon.stub(logger, "error");
    sinon.stub(logger, "debug");
    sinon.stub(logger, "info");
    sinon.stub(logger, "warn");
  });

  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("lets a user fee update run mid-pass and never re-sends the replaced value", async function () {
    this.timeout(20 * 1000);
    // 800 keys at 5 ms per write: a pass far longer than one slice, as on a large node.
    const keys = seed(800);
    const target = keys[keys.length - 1];
    const signerApi = sinon.createStubInstance(Web3SignerApi);
    const validatorApi = sinon.createStubInstance(ValidatorApi);
    signerApi.upcheck.resolves();
    signerApi.listRemoteKeys.resolves({
      data: keys.map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    validatorApi.getRemoteKeys.resolves({ data: keys.map((pubkey) => ({ pubkey, readonly: false, url: "" })) });
    validatorApi.setFeeRecipient.callsFake(() => sleep(5));

    const started = Date.now();
    const pass = reloadValidators(signerApi, "http://signer", validatorApi, brainDb);
    await sleep(300);
    const updateStarted = Date.now();
    await updateValidators({
      brainDb,
      validatorApi,
      signerUrl: "http://signer",
      reloadValidatorsCronTask: sinon.createStubInstance(CronJob),
      customValidatorUpdateRequest: [{ pubkey: target, feeRecipient: newRecipient }]
    });
    const waited = Date.now() - updateStarted;
    await pass;

    // The pass was still running when the update finished, so the update did not wait for all of it.
    expect(Date.now() - started).to.be.greaterThan(waited + 1000);
    expect(waited).to.be.lessThan(RELOAD_SLICE_MAX_HOLD_MS + 500);
    // Every key was configured by the pass.
    const reloadCalls = validatorApi.setFeeRecipient.getCalls().filter((call) => call.args[2] !== undefined);
    expect(new Set(reloadCalls.map((call) => call.args[1])).size).to.equal(keys.length);
    // The pass reached the target after the update and sent the new value, not its stale snapshot.
    const targetCalls = reloadCalls.filter((call) => call.args[1] === target);
    expect(targetCalls.map((call) => call.args[0])).to.deep.equal([newRecipient]);
    expect(brainDb.getData()[target].feeRecipient).to.equal(newRecipient);
  });

  it("skips keys deleted while the pass is running", async () => {
    const keys = seed(3);
    const validatorApi = sinon.createStubInstance(ValidatorApi);
    validatorApi.setFeeRecipient.onFirstCall().callsFake(async () => brainDb.deleteValidators([keys[2]]));
    validatorApi.setFeeRecipient.resolves();
    // One key per slice, so the deletion lands between slices.
    await postValidatorsFeeRecipientsFromDb({ validatorApi, brainDb, pubkeys: keys, maxHoldMs: 0 });
    expect(validatorApi.setFeeRecipient.getCalls().map((call) => call.args[1])).to.deep.equal(keys.slice(0, 2));
  });

  it("skips builder configuration when the validator client stopped responding to fee recipients", async () => {
    const keys = seed(3, { builderConfig });
    const signerApi = sinon.createStubInstance(Web3SignerApi);
    const validatorApi = sinon.createStubInstance(ValidatorApi);
    signerApi.upcheck.resolves();
    signerApi.listRemoteKeys.resolves({
      data: keys.map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    validatorApi.getRemoteKeys.resolves({ data: keys.map((pubkey) => ({ pubkey, readonly: false, url: "" })) });
    // What the real client throws when a request gets no response.
    validatorApi.setFeeRecipient.rejects(new ValidatorApiError("fee", { cause: new ApiError("timed out") }));
    validatorApi.setBuilderConfig.resolves();
    featureFlags.builderConfig = true;
    try {
      await reloadValidators(signerApi, "http://signer", validatorApi, brainDb);
      expect(validatorApi.setFeeRecipient.callCount).to.equal(1);
      expect(validatorApi.setBuilderConfig.called).to.equal(false);

      // A responsive client gets both phases again on the next pass.
      validatorApi.setFeeRecipient.resolves();
      await reloadValidators(signerApi, "http://signer", validatorApi, brainDb);
      expect(validatorApi.setBuilderConfig.callCount).to.equal(keys.length);
    } finally {
      featureFlags.builderConfig = false;
    }
  });

  describe("against a real validator client connection", () => {
    let server: http.Server;
    let validatorApi: ValidatorApi;
    let requests: string[];
    let respond: (req: http.IncomingMessage, res: http.ServerResponse) => void;

    beforeEach(async () => {
      requests = [];
      server = http.createServer((req, res) => {
        requests.push(req.url ?? "");
        req.resume();
        respond(req, res);
      });
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const { port } = server.address() as AddressInfo;
      validatorApi = new ValidatorApi({ baseUrl: `http://127.0.0.1:${port}` }, Network.Mainnet);
    });

    afterEach(() => {
      server.closeAllConnections();
      server.close();
    });

    it("stops at the first request that times out and retries every key next pass", async () => {
      const keys = seed(3);
      respond = () => undefined; // never answers
      const started = Date.now();
      await postValidatorsFeeRecipientsFromDb({ validatorApi, brainDb, pubkeys: keys, timeoutMs: 100 });
      expect(Date.now() - started).to.be.lessThan(2000);
      expect(requests).to.have.length(1);

      respond = (_req, res) => res.writeHead(202).end();
      await postValidatorsFeeRecipientsFromDb({ validatorApi, brainDb, pubkeys: keys, timeoutMs: 100 });
      expect(requests).to.have.length(1 + keys.length);
    });

    it("keeps going past HTTP errors, which concern only one key", async () => {
      const keys = seed(3);
      respond = (req, res) => res.writeHead(req.url?.includes(keys[0]) ? 404 : 202).end();
      await postValidatorsFeeRecipientsFromDb({ validatorApi, brainDb, pubkeys: keys });
      expect(requests).to.have.length(keys.length);
    });

    it("stops at the first refused connection", async () => {
      const keys = seed(3);
      const { port } = server.address() as AddressInfo;
      server.close();
      await once(server, "close");
      const closedApi = new ValidatorApi({ baseUrl: `http://127.0.0.1:${port}` }, Network.Mainnet);
      const spy = sinon.spy(closedApi, "setFeeRecipient");
      await postValidatorsFeeRecipientsFromDb({ validatorApi: closedApi, brainDb, pubkeys: keys });
      expect(spy.callCount).to.equal(1);
      server.listen(0, "127.0.0.1"); // let afterEach close it cleanly
      await once(server, "listening");
    });

    it("stops builder configuration at the first refused connection", async () => {
      const keys = seed(3, { builderConfig });
      const { port } = server.address() as AddressInfo;
      server.close();
      await once(server, "close");
      const closedApi = new ValidatorApi({ baseUrl: `http://127.0.0.1:${port}` }, Network.Mainnet);
      const spy = sinon.spy(closedApi, "setBuilderConfig");
      expect(await postValidatorsBuilderConfigsFromDb({ validatorApi: closedApi, brainDb, pubkeys: keys })).to.equal(
        "stopped"
      );
      expect(spy.callCount).to.equal(1);
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
    });

    it("keeps applying builder configuration past HTTP errors without logging response bodies", async () => {
      const keys = seed(3, { builderConfig });
      respond = (req, res) =>
        req.url?.includes(keys[0]) ? res.writeHead(500).end("echoed-secret-authorization") : res.writeHead(200).end();
      expect(await postValidatorsBuilderConfigsFromDb({ validatorApi, brainDb, pubkeys: keys })).to.equal("completed");
      expect(requests).to.have.length(keys.length);
      const logged = (logger.error as sinon.SinonStub).getCalls().map((call) => inspect(call.args, { depth: 10 }));
      expect(logged.join("\n")).to.include("HTTP 500").and.not.include("echoed-secret");
    });
  });
});

import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BuilderConfig, Network, MEV_SP_ADDRESS_MAINNET } from "@stakingbrain/common";
import { ValidatorApi, Web3SignerApi, BeaconchainApi } from "../../../../src/modules/apiClients/index.js";
import { AllowedMethods } from "../../../../src/modules/apiClients/types.js";
import { HttpApiError } from "../../../../src/modules/apiClients/error.js";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import { CronJob } from "../../../../src/modules/cron/cron.js";
import { reloadValidators } from "../../../../src/modules/cron/reloadValidators/index.js";
import { updateValidators } from "../../../../src/modules/apiServers/ui/calls/updateValidators.js";
import { getBuilderConfigs } from "../../../../src/modules/apiServers/ui/calls/getBuilderConfigs.js";
import { getValidators } from "../../../../src/modules/apiServers/ui/calls/getValidators.js";
import logger from "../../../../src/modules/logger/index.js";

const keys = ["11", "22", "33"].map((byte) => "0x" + byte.repeat(48));
const recipient = "0x" + "ab".repeat(20);
const config: BuilderConfig = {
  min_bid: "9007199254740993",
  builders: [{ url: "https://builder.example", max_execution_payment: "18446744073709551615" }]
};

type Request = { method: AllowedMethods; endpoint: string; body?: string };
class RecordingValidator extends ValidatorApi {
  calls: Request[] = [];
  remoteKeys: string[] = [];
  resolved: BuilderConfig = { min_bid: "100", builder_boost_factor: "100", builders: [] };
  failure?: Error;
  failKey?: string;
  constructor() {
    super({ baseUrl: "http://validator:3500", authToken: "token" }, Network.Mainnet);
  }
  protected async request(request: Request): Promise<unknown> {
    this.calls.push(request);
    if (request.endpoint.endsWith("builder_config")) {
      if (this.failure && (!this.failKey || request.endpoint.includes(this.failKey))) throw this.failure;
      return request.method === "GET" ? { data: this.resolved } : undefined;
    }
    if (request.endpoint.endsWith("remotekeys")) {
      if (request.method === "GET") return { data: this.remoteKeys.map((pubkey) => ({ pubkey })) };
      if (request.method === "POST") {
        const entries = JSON.parse(request.body!).remote_keys as { pubkey: string }[];
        this.remoteKeys.push(...entries.map(({ pubkey }) => pubkey));
        return { data: entries.map(() => ({ status: "imported", message: "" })) };
      }
    }
    return undefined;
  }
}

async function rejection(action: Promise<unknown>): Promise<Error> {
  try {
    await action;
  } catch (error) {
    return error;
  }
  throw new Error("Expected rejection");
}

describe("Builder configuration management", () => {
  let directory: string;
  let db: BrainDataBase;
  let api: RecordingValidator;
  let cron: sinon.SinonStubbedInstance<CronJob>;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-builders-"));
    db = new BrainDataBase(path.join(directory, "db.json"));
    db.addValidators({
      validators: Object.fromEntries(
        keys.map((key) => [key, { tag: "solo", feeRecipient: recipient, automaticImport: false, index: 42 }])
      )
    });
    api = new RecordingValidator();
    cron = sinon.createStubInstance(CronJob);
    sinon.stub(logger, "error");
  });
  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const update = (
    brainDb: BrainDataBase,
    validatorApi: ValidatorApi,
    reloadValidatorsCronTask: CronJob,
    requests: Parameters<typeof updateValidators>[0]["customValidatorUpdateRequest"]
  ) => updateValidators({ brainDb, validatorApi, reloadValidatorsCronTask, customValidatorUpdateRequest: requests });

  it("serializes sparse replacement and uint64 strings and supports GET/DELETE", async () => {
    await api.setBuilderConfig(config, keys[0].slice(2));
    expect(api.calls[0]).to.include({
      method: "POST",
      endpoint: `/eth/v1/validator/${keys[0]}/builder_config`,
      body: JSON.stringify(config)
    });
    expect((await api.getBuilderConfig(keys[0])).data).to.deep.equal(api.resolved);
    await api.setBuilderConfig({}, keys[0]);
    expect(api.calls.at(-1)?.body).to.equal("{}");
    await api.deleteBuilderConfig(keys[0]);
    expect(api.calls.at(-1)).to.include({ method: "DELETE", body: undefined });
    expect(api.getBuilderConfigStatus(keys[0])).to.deep.equal({ status: "applied" });
    const count = api.calls.length;
    expect(
      (await rejection(api.setBuilderConfig({ min_bid: 1 } as unknown as BuilderConfig, keys[0]))).message
    ).to.include("uint64");
    expect((await rejection(api.setBuilderConfig({}, "../bad"))).message).to.include("public key");
    expect(api.calls.length).to.equal(count);
  });

  it("persists original overrides across process restart and partial fee/index updates", async () => {
    await update(db, api, cron, [{ pubkey: keys[0].slice(2), builderConfig: config }]);
    const reopened = new BrainDataBase(path.join(directory, "db.json"));
    expect(reopened.getData()[keys[0]].builderConfig).to.deep.equal(config);
    reopened.updateValidators({ validators: { [keys[0]]: { index: 77 } } });
    await update(reopened, api, cron, [{ pubkey: keys[0], feeRecipient: recipient }]);
    expect(reopened.getData()[keys[0]]).to.include({ index: 77, feeRecipient: recipient });
    expect(reopened.getData()[keys[0]].builderConfig).to.deep.equal(config);
    expect(reopened.getData()[keys[1]]).not.to.have.property("builderConfig");
  });

  it("keeps empty list, no overrides, reset and unmanaged states distinct", async () => {
    await update(db, api, cron, [
      { pubkey: keys[0], builderConfig: { builders: [] } },
      { pubkey: keys[1], builderConfig: {} }
    ]);
    expect(db.getData()[keys[0]].builderConfig).to.deep.equal({ builders: [] });
    expect(db.getData()[keys[1]].builderConfig).to.deep.equal({});
    expect(db.getData()[keys[2]]).not.to.have.property("builderConfig");
    await update(db, api, cron, [{ pubkey: keys[0], builderConfig: null }]);
    expect(new BrainDataBase(path.join(directory, "db.json")).getData()[keys[0]].builderConfig).to.equal(null);
    expect(api.calls.at(-1)?.method).to.equal("DELETE");
  });

  it("reads resolved values separately without ever freezing defaults or mutating persistence", async () => {
    await update(db, api, cron, [{ pubkey: keys[0], builderConfig: {} }]);
    const before = fs.readFileSync(path.join(directory, "db.json"), "utf8");
    const result = await getBuilderConfigs({ pubkeys: [keys[0]], brainDb: db, validatorApi: api });
    expect(result[0]).to.include({ status: "success" });
    expect(result[0].builderConfig).to.deep.equal({});
    expect(result[0].resolved).to.deep.equal(api.resolved);
    api.resolved = { min_bid: "999", builders: [] };
    await getBuilderConfigs({ pubkeys: [keys[0]], brainDb: db, validatorApi: api });
    expect(fs.readFileSync(path.join(directory, "db.json"), "utf8")).to.equal(before);
  });

  it("validates the whole batch before writes and always resumes reload", async () => {
    const before = fs.readFileSync(path.join(directory, "db.json"), "utf8");
    for (const invalid of [
      { pubkey: keys[1], builderConfig: { builders: [{ url: "bad" }] } },
      { pubkey: keys[1], feeRecipient: "0x1234" },
      { pubkey: "0x" + "ff".repeat(48), builderConfig: {} }
    ]) {
      await rejection(update(db, api, cron, [{ pubkey: keys[0], builderConfig: config }, invalid]));
      expect(fs.readFileSync(path.join(directory, "db.json"), "utf8")).to.equal(before);
    }
    expect(api.calls).to.have.length(0);
    expect(cron.start.callCount).to.equal(3);
  });

  it("reports unsupported/failing APIs, redacts echoed auth and continues the batch", async () => {
    for (const statusCode of [400, 401, 403, 404, 405, 500, 501]) {
      api.failure = new HttpApiError(statusCode, "echoed-secret-authorization");
      api.failKey = keys[0];
      const error = await rejection(
        update(db, api, cron, [
          { pubkey: keys[0], builderConfig: config },
          { pubkey: keys[1], builderConfig: {} }
        ])
      );
      expect(error.message)
        .to.include(`HTTP ${statusCode}`)
        .and.include("Settings saved")
        .and.not.include("echoed-secret");
      expect(api.getBuilderConfigStatus(keys[0])?.status).to.equal(
        [405, 501].includes(statusCode) ? "unsupported" : "error"
      );
      expect(api.getBuilderConfigStatus(keys[1])?.status).to.equal("applied");
      expect(db.getData()[keys[0]].builderConfig).to.deep.equal(config);
    }
    const result = await getBuilderConfigs({ pubkeys: keys, brainDb: db, validatorApi: api });
    expect(result[0].status).to.equal("error");
    expect(result[1].status).to.equal("success");
    await api.setFeeRecipient(recipient, keys[0]);
    await api.getRemoteKeys();
    expect(api.calls.at(-1)?.endpoint).to.equal("/eth/v1/remotekeys");
  });

  it("reimports keys after restarts, retries failures/resets and replays sparse overrides on every reload", async () => {
    db.updateValidators({ validators: { [keys[0]]: { builderConfig: config }, [keys[1]]: { builderConfig: null } } });
    const signer = sinon.createStubInstance(Web3SignerApi);
    signer.upcheck.resolves();
    signer.listRemoteKeys.resolves({
      data: keys.map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    api.failure = new HttpApiError(500, "failure");
    api.failKey = keys[0];
    await reloadValidators(signer, "http://signer:9000", api, db);
    expect(api.remoteKeys).to.deep.equal(keys);
    expect(api.calls.findIndex(({ endpoint }) => endpoint.endsWith("feerecipient"))).to.be.lessThan(
      api.calls.findIndex(({ endpoint }) => endpoint.endsWith("builder_config"))
    );
    expect(api.getBuilderConfigStatus(keys[0])?.status).to.equal("error");
    expect(api.getBuilderConfigStatus(keys[1])?.status).to.equal("applied");
    api.failure = undefined;
    api.remoteKeys = []; // validator restart
    await reloadValidators(signer, "http://signer:9000", api, db);
    await reloadValidators(signer, "http://signer:9000", api, db);
    expect(api.getBuilderConfigStatus(keys[0])?.status).to.equal("applied");
    expect(
      api.calls.filter(({ endpoint, method }) => endpoint.includes(keys[1]) && method === "DELETE")
    ).to.have.length(3);
    expect(
      api.calls.filter(({ endpoint }) => endpoint.includes(keys[2]) && endpoint.endsWith("builder_config"))
    ).to.have.length(0);
    expect(
      api.calls
        .filter(
          ({ endpoint, method }) =>
            endpoint.includes(keys[0]) && endpoint.endsWith("builder_config") && method === "POST"
        )
        .map(({ body }) => body)
    ).to.deep.equal(Array(3).fill(JSON.stringify(config)));
    expect(
      api.calls.filter(({ endpoint, method }) => endpoint.endsWith("builder_config") && method === "GET")
    ).to.have.length(0);
  });

  it("preserves Smooth payout destination and protocol fee-recipient restrictions", async () => {
    const smooth = MEV_SP_ADDRESS_MAINNET;
    db.updateValidators({ validators: { [keys[0]]: { feeRecipient: smooth } } });
    await update(db, api, cron, [{ pubkey: keys[0], builderConfig: { builders: [], builder_boost_factor: "0" } }]);
    expect(db.getData()[keys[0]].feeRecipient).to.equal(smooth);
    // Other protocols may also configure builders without gaining fee-recipient editing rights.
    db.data![keys[1]].tag = "rocketpool";
    db.write();
    await update(db, api, cron, [{ pubkey: keys[1], feeRecipient: smooth, builderConfig: {} }]);
    expect(db.getData()[keys[1]].feeRecipient).to.equal(recipient);
    const signer = sinon.createStubInstance(Web3SignerApi);
    signer.upcheck.resolves();
    signer.listRemoteKeys.resolves({
      data: keys.map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    api.failure = new HttpApiError(501, "unsupported");
    await reloadValidators(signer, "http://signer:9000", api, db);
    expect(
      api.calls.filter(({ endpoint }) => endpoint.includes(keys[0]) && endpoint.endsWith("feerecipient")).at(-1)?.body
    ).to.equal(JSON.stringify({ ethaddress: smooth }));
    expect(db.getData()[keys[0]].feeRecipient).to.equal(smooth);
  });

  it("retains failed reset intent across Brain restart and applies configuration to a newly imported key", async () => {
    await update(db, api, cron, [{ pubkey: keys[0], builderConfig: config }]);
    api.failure = new HttpApiError(403, "read-only validator config");
    await rejection(update(db, api, cron, [{ pubkey: keys[0], builderConfig: null }]));
    const reopened = new BrainDataBase(path.join(directory, "db.json"));
    expect(reopened.getData()[keys[0]].builderConfig).to.equal(null);
    const restartedApi = new RecordingValidator();
    const newKey = "0x" + "44".repeat(48);
    reopened.addValidators({
      validators: {
        [newKey]: {
          tag: "solo",
          feeRecipient: recipient,
          automaticImport: false,
          builderConfig: { builder_boost_factor: "0" }
        }
      }
    });
    const signer = sinon.createStubInstance(Web3SignerApi);
    signer.upcheck.resolves();
    signer.listRemoteKeys.resolves({
      data: [...keys, newKey].map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    await reloadValidators(signer, "http://signer:9000", restartedApi, reopened);
    expect(
      restartedApi.calls.some(
        ({ endpoint, method }) =>
          endpoint.includes(keys[0]) && endpoint.endsWith("builder_config") && method === "DELETE"
      )
    ).to.equal(true);
    expect(restartedApi.remoteKeys).to.include(newKey);
    expect(
      restartedApi.calls.find(({ endpoint }) => endpoint.includes(newKey) && endpoint.endsWith("builder_config"))?.body
    ).to.equal('{"builder_boost_factor":"0"}');
    expect(restartedApi.getBuilderConfigStatus(keys[0])?.status).to.equal("applied");
  });

  it("exposes network errors and malformed GET responses without changing stored overrides", async () => {
    await update(db, api, cron, [{ pubkey: keys[0], builderConfig: {} }]);
    api.failure = new Error("Request timed out");
    const network = await getBuilderConfigs({ pubkeys: [keys[0]], brainDb: db, validatorApi: api });
    expect(network[0].message).to.include("timed out");
    api.failure = undefined;
    api.resolved = { min_bid: 123 } as unknown as BuilderConfig;
    const malformed = await getBuilderConfigs({ pubkeys: [keys[0]], brainDb: db, validatorApi: api });
    expect(malformed[0].status).to.equal("error");
    expect(malformed[0].message).to.include("uint64");
    expect(db.getData()[keys[0]].builderConfig).to.deep.equal({});
  });

  it("enforces the existing database size limit before persisting a large bulk replacement", () => {
    const manyKeys = Array.from({ length: 14 }, (_, index) => "0x" + (index + 100).toString(16).padStart(96, "0"));
    db.addValidators({
      validators: Object.fromEntries(
        manyKeys.map((key) => [key, { tag: "solo", feeRecipient: recipient, automaticImport: false }])
      )
    });
    const large: BuilderConfig = {
      builders: Array.from({ length: 64 }, (_, index) => ({
        url: `https://builder-${index}.example`,
        auth_data: "0x" + "ab".repeat(4096)
      }))
    };
    const before = fs.readFileSync(path.join(directory, "db.json"), "utf8");
    expect(() =>
      db.updateValidators({ validators: Object.fromEntries(manyKeys.map((key) => [key, { builderConfig: large }])) })
    ).to.throw("too big");
    expect(fs.readFileSync(path.join(directory, "db.json"), "utf8")).to.equal(before);
    expect(db.getData()[manyKeys[0]]).not.to.have.property("builderConfig");
  });

  it("reports actual fee destination matches and keeps the validator list usable without builder APIs", async () => {
    const validator = sinon.createStubInstance(ValidatorApi);
    validator.getRemoteKeys.resolves({
      data: keys.map((pubkey) => ({ pubkey, readonly: false, url: "http://signer" }))
    });
    for (const [index, key] of keys.entries())
      validator.getFeeRecipient.withArgs(key).resolves({
        data: {
          pubkey: key,
          ethaddress: index === 0 ? recipient.toUpperCase().replace("0X", "0x") : "0x" + "00".repeat(20)
        }
      });
    const signer = sinon.createStubInstance(Web3SignerApi);
    signer.listRemoteKeys.resolves({
      data: keys.map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    const beacon = sinon.createStubInstance(BeaconchainApi);
    beacon.getStateValidator.rejects(new Error("not deposited"));
    const result = await getValidators({
      brainDb: db,
      validatorApi: validator,
      signerApi: signer,
      beaconchainApi: beacon
    });
    expect(result.map(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect)).to.deep.equal([
      true,
      false,
      false
    ]);
    expect(validator.getBuilderConfig.called).to.equal(false);
  });
});

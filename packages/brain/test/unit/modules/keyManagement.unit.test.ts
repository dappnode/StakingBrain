import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Network } from "@stakingbrain/common";
import { BrainDataBase } from "../../../src/modules/db/index.js";
import { CronJob } from "../../../src/modules/cron/cron.js";
import { ValidatorApi, Web3SignerApi } from "../../../src/modules/apiClients/index.js";
import { importValidators } from "../../../src/modules/apiServers/ui/calls/importValidators.js";
import { deleteValidators } from "../../../src/modules/apiServers/ui/calls/deleteValidators.js";
import { updateValidators } from "../../../src/modules/apiServers/ui/calls/updateValidators.js";
import { reloadValidators } from "../../../src/modules/cron/reloadValidators/index.js";
import type { CustomImportRequest } from "../../../src/modules/apiServers/ui/calls/types.js";
import logger from "../../../src/modules/logger/index.js";

const keys = ["11", "22", "33"].map((byte) => "0x" + byte.repeat(48));
const recipient = "0x" + "ab".repeat(20);
const record = { tag: "solo" as const, feeRecipient: recipient, automaticImport: false };

describe("Key management partial failures", () => {
  let directory: string;
  let brainDb: BrainDataBase;
  let signerApi: sinon.SinonStubbedInstance<Web3SignerApi>;
  let validatorApi: sinon.SinonStubbedInstance<ValidatorApi>;
  let reloadValidatorsCronTask: sinon.SinonStubbedInstance<CronJob>;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-keys-"));
    brainDb = new BrainDataBase(path.join(directory, "db.json"));
    signerApi = sinon.createStubInstance(Web3SignerApi);
    validatorApi = sinon.createStubInstance(ValidatorApi);
    reloadValidatorsCronTask = sinon.createStubInstance(CronJob);
    signerApi.importRemoteKeys.callsFake(async ({ keystores }) => ({
      data: keystores.map(() => ({ status: "imported", message: "" }))
    }));
    validatorApi.postRemoteKeys.resolves({ data: [] });
    validatorApi.setFeeRecipient.resolves();
    validatorApi.deleteRemoteKeys.resolves({ data: [] });
    validatorApi.deleteFeeRecipient.resolves();
    sinon.stub(logger, "error");
    sinon.stub(logger, "debug");
    sinon.stub(logger, "info");
  });

  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const request = (): CustomImportRequest => ({
    importFrom: "ui",
    validatorsImportRequest: keys.map((pubkey) => ({
      keystore: JSON.stringify({ pubkey: pubkey.slice(2) }),
      password: "password",
      tag: "solo",
      feeRecipient: recipient
    }))
  });
  const runImport = (postRequest: CustomImportRequest) =>
    importValidators({
      brainDb,
      signerApi,
      validatorApi,
      reloadValidatorsCronTask,
      postRequest,
      network: Network.Mainnet,
      signerUrl: "http://signer:9000"
    });

  it("keeps per-key import results aligned when a protocol fee recipient cannot be resolved", async () => {
    const postRequest = request();
    postRequest.validatorsImportRequest[0].tag = "stakewise";
    const result = await runImport(postRequest);
    expect(result.data.map(({ status }) => status)).to.deep.equal(["error", "imported", "imported"]);
    expect(Object.keys(brainDb.getData())).to.deep.equal(keys.slice(1));
  });

  it("rejects invalid metadata before sending those keys to the signer", async () => {
    const postRequest = request();
    postRequest.validatorsImportRequest[0].feeRecipient = "invalid";
    postRequest.validatorsImportRequest[1].keystore = "not JSON";
    const result = await runImport(postRequest);
    expect(result.data.map(({ status }) => status)).to.deep.equal(["error", "error", "imported"]);
    expect(signerApi.importRemoteKeys.firstCall.args[0].keystores).to.deep.equal([
      postRequest.validatorsImportRequest[2].keystore
    ]);
    expect(Object.keys(brainDb.getData())).to.deep.equal([keys[2]]);
  });

  it("recovers signer duplicates missing from Brain after an interrupted import", async () => {
    signerApi.importRemoteKeys.resolves({ data: keys.map(() => ({ status: "duplicate", message: "" })) });
    await runImport(request());
    expect(Object.keys(brainDb.getData())).to.deep.equal(keys);
    expect(validatorApi.postRemoteKeys.firstCall.args[0].remote_keys.map(({ pubkey }) => pubkey)).to.deep.equal(keys);
  });

  it("preserves existing settings when duplicate keys are uploaded again", async () => {
    brainDb.addValidators({ validators: { [keys[0]]: { ...record, builderConfig: { min_bid: "42" } } } });
    signerApi.importRemoteKeys.resolves({ data: keys.map(() => ({ status: "duplicate", message: "" })) });
    const postRequest = request();
    postRequest.validatorsImportRequest[0].feeRecipient = "0x" + "cd".repeat(20);
    await runImport(postRequest);
    expect(brainDb.getData()[keys[0]]).to.deep.equal({ ...record, builderConfig: { min_bid: "42" } });
  });

  it("retains keys whose signer deletion failed, including across a database reopen", async () => {
    brainDb.addValidators({ validators: Object.fromEntries(keys.map((key) => [key, { ...record }])) });
    signerApi.deleteRemoteKeys.resolves({
      data: [
        { status: "deleted", message: "" },
        { status: "error", message: "Signer is busy" },
        { status: "not_found", message: "" }
      ]
    });
    await deleteValidators({
      brainDb,
      signerApi,
      validatorApi,
      reloadValidatorsCronTask,
      deleteRequest: { pubkeys: keys }
    });
    expect(Object.keys(new BrainDataBase(path.join(directory, "db.json")).getData())).to.deep.equal([keys[1]]);
    expect(reloadValidatorsCronTask.start.calledOnce).to.equal(true);
  });

  it("reports fee-recipient application failures while preserving desired settings for reload", async () => {
    brainDb.addValidators({ validators: Object.fromEntries(keys.map((key) => [key, { ...record }])) });
    validatorApi.setFeeRecipient.withArgs(recipient, keys[0]).rejects(new Error("Client unavailable"));
    const result = await updateValidators({
      brainDb,
      validatorApi,
      reloadValidatorsCronTask,
      customValidatorUpdateRequest: keys.map((pubkey) => ({ pubkey, feeRecipient: recipient }))
    }).catch((error: Error) => error);
    expect(result).to.be.instanceOf(Error).and.have.property("message").that.includes("Settings saved");
    expect(validatorApi.setFeeRecipient.callCount).to.equal(keys.length);
    expect(brainDb.getData()[keys[0]].feeRecipient).to.equal(recipient);
    expect(reloadValidatorsCronTask.start.calledOnce).to.equal(true);
  });

  it("does not delete signer keys when the database becomes corrupted or disappears", async () => {
    brainDb.addValidators({ validators: { [keys[0]]: { ...record } } });
    signerApi.upcheck.resolves();
    fs.writeFileSync(path.join(directory, "db.json"), "{invalid");
    await reloadValidators(signerApi, "http://signer", validatorApi, brainDb);
    expect(signerApi.deleteRemoteKeys.called).to.equal(false);
    expect(signerApi.listRemoteKeys.called).to.equal(false);
    fs.rmSync(path.join(directory, "db.json"));
    await reloadValidators(signerApi, "http://signer", validatorApi, brainDb);
    expect(signerApi.deleteRemoteKeys.called).to.equal(false);
    expect(signerApi.listRemoteKeys.called).to.equal(false);
  });

  it("does not remove keys when signer and validator APIs use different hex casing", async () => {
    const pubkey = "0x" + "ab".repeat(48);
    const upper = "0x" + "AB".repeat(48);
    brainDb.addValidators({ validators: { [pubkey]: { ...record } } });
    signerApi.upcheck.resolves();
    signerApi.listRemoteKeys.resolves({ data: [{ validating_pubkey: upper, derivation_path: "", readonly: false }] });
    validatorApi.getRemoteKeys.resolves({ data: [{ pubkey: upper, readonly: false, url: "http://signer" }] });
    await reloadValidators(signerApi, "http://signer", validatorApi, brainDb);
    expect(signerApi.deleteRemoteKeys.called).to.equal(false);
    expect(validatorApi.deleteRemoteKeys.called).to.equal(false);
    expect(validatorApi.postRemoteKeys.called).to.equal(false);
    expect(Object.keys(brainDb.getData())).to.deep.equal([pubkey]);
  });
});

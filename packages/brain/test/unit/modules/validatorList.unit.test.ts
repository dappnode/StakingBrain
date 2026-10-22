import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrainDataBase } from "../../../src/modules/db/index.js";
import { ValidatorApi, Web3SignerApi, BeaconchainApi } from "../../../src/modules/apiClients/index.js";
import { getValidators } from "../../../src/modules/apiServers/ui/calls/getValidators.js";
import logger from "../../../src/modules/logger/index.js";

const keys = Array.from({ length: 30 }, (_, index) => "0x" + (index + 1).toString(16).padStart(96, "0"));
const feeRecipient = "0x" + "ab".repeat(20);

describe("Validator list bulk reads", () => {
  let directory: string;
  let brainDb: BrainDataBase;
  let validatorApi: sinon.SinonStubbedInstance<ValidatorApi>;
  let signerApi: sinon.SinonStubbedInstance<Web3SignerApi>;
  let beaconchainApi: sinon.SinonStubbedInstance<BeaconchainApi>;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-list-"));
    brainDb = new BrainDataBase(path.join(directory, "db.json"));
    brainDb.addValidators({
      validators: Object.fromEntries(keys.map((key) => [key, { tag: "solo", feeRecipient, automaticImport: false }]))
    });
    validatorApi = sinon.createStubInstance(ValidatorApi);
    signerApi = sinon.createStubInstance(Web3SignerApi);
    beaconchainApi = sinon.createStubInstance(BeaconchainApi);
    validatorApi.getRemoteKeys.resolves({
      data: keys.map((pubkey) => ({ pubkey, readonly: false, url: "http://signer" }))
    });
    signerApi.listRemoteKeys.resolves({
      data: keys.map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    validatorApi.getFeeRecipient.resolves({ data: { ethaddress: feeRecipient } });
    sinon.stub(logger, "error");
  });
  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const read = () => getValidators({ brainDb, validatorApi, signerApi, beaconchainApi });

  it("keeps successful fee checks when a different validator fails", async () => {
    validatorApi.getFeeRecipient.withArgs(keys[0]).rejects(new Error("key missing"));
    beaconchainApi.getStateValidator.rejects(new Error("not deposited"));
    const results = await read();
    expect(results.map(({ pubkey }) => pubkey)).to.deep.equal(keys);
    expect(results[0].validatorFeeRecipientCorrect).to.equal(false);
    expect(results.slice(1).every(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect)).to.equal(true);
  });

  it("bounds concurrent beacon reads and stops the whole list at its deadline", async () => {
    const clock = sinon.useFakeTimers();
    beaconchainApi.getStateValidator.callsFake(
      async ({ signal }) =>
        new Promise((_resolve, reject) => {
          if (signal?.aborted) reject(new Error("Aborted"));
          signal!.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
        })
    );
    const pending = read();
    await clock.tickAsync(9999);
    expect(beaconchainApi.getStateValidator.callCount).to.equal(8);
    await clock.tickAsync(1);
    const results = await pending;
    expect(results.map(({ pubkey }) => pubkey)).to.deep.equal(keys);
    expect(results.every(({ withdrawalCredentials }) => withdrawalCredentials.format === "error")).to.equal(true);
    expect(beaconchainApi.getStateValidator.callCount).to.equal(8);
    expect(clock.countTimers()).to.equal(0);
  });
});

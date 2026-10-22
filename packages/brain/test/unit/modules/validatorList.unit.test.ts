import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrainDataBase } from "../../../src/modules/db/index.js";
import { ValidatorApi, Web3SignerApi, BeaconchainApi } from "../../../src/modules/apiClients/index.js";
import { getValidators } from "../../../src/modules/apiServers/ui/calls/getValidators.js";
import logger from "../../../src/modules/logger/index.js";
import type { BeaconchainValidatorFromStateGetResponse } from "../../../src/modules/apiClients/beaconchain/types.js";
import { ValidatorStatus } from "../../../src/modules/apiClients/beaconchain/types.js";

const keys = Array.from({ length: 30 }, (_, index) => "0x" + (index + 1).toString(16).padStart(96, "0"));
const feeRecipient = "0x" + "ab".repeat(20);
const beaconResponse = (pubkey: string, address: string): BeaconchainValidatorFromStateGetResponse => ({
  execution_optimistic: false,
  data: {
    index: String(keys.indexOf(pubkey)),
    balance: "32000000000",
    status: ValidatorStatus.ACTIVE_ONGOING,
    validator: {
      pubkey,
      withdrawal_credentials: address,
      effective_balance: "32000000000",
      slashed: false,
      activation_eligibility_epoch: "0",
      activation_epoch: "0",
      exit_epoch: "18446744073709551615",
      withdrawable_epoch: "18446744073709551615"
    }
  }
});

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
    expect(results[0].validatorFeeRecipientCorrect).to.equal(undefined);
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

  it("finishes later beacon reads on refresh and retains earlier results without delaying fee checks", async () => {
    const clock = sinon.useFakeTimers();
    const address = "0x01" + "00".repeat(11) + "ab".repeat(20);
    beaconchainApi.getStateValidator.callsFake(
      ({ pubkey, signal }) =>
        new Promise((resolve, reject) => {
          const abort = () => {
            clearTimeout(timer);
            reject(new Error("Aborted"));
          };
          const timer = setTimeout(() => {
            signal!.removeEventListener("abort", abort);
            resolve(beaconResponse(pubkey, address));
          }, 4000);
          signal!.addEventListener("abort", abort, { once: true });
        })
    );
    const first = read();
    await clock.tickAsync(10000);
    const firstResults = await first;
    expect(firstResults.filter(({ index }) => index !== "").length).to.equal(16);
    expect(firstResults.every(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect)).to.equal(true);
    const second = read();
    await clock.tickAsync(10000);
    const secondResults = await second;
    expect(secondResults.map(({ index }) => index)).to.deep.equal(keys.map((_, index) => String(index)));
    expect(secondResults.every(({ withdrawalCredentials }) => withdrawalCredentials.address === address)).to.equal(
      true
    );
    // Expiration forces fresh reads so changed withdrawal credentials are not cached forever.
    await clock.tickAsync(60000);
    beaconchainApi.getStateValidator.resetHistory();
    const third = read();
    await clock.tickAsync(10000);
    await third;
    expect(beaconchainApi.getStateValidator.callCount).to.be.greaterThan(0);
    expect(clock.countTimers()).to.equal(0);
  });

  it("rotates stalled fee reads and keeps unverified results unknown", async () => {
    const clock = sinon.useFakeTimers();
    beaconchainApi.getStateValidator.rejects(new Error("not deposited"));
    validatorApi.getFeeRecipient.callsFake(
      async (_pubkey, signal) =>
        new Promise((_resolve, reject) => {
          signal!.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
        })
    );
    const first = read();
    await clock.tickAsync(10000);
    expect(
      (await first).every(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect === undefined)
    ).to.equal(true);
    expect(validatorApi.getFeeRecipient.args.map(([pubkey]) => pubkey)).to.deep.equal(keys.slice(0, 8));
    validatorApi.getFeeRecipient.resetHistory();
    const second = read();
    await clock.tickAsync(10000);
    await second;
    expect(validatorApi.getFeeRecipient.args.map(([pubkey]) => pubkey)).to.deep.equal(keys.slice(8, 16));
    expect(clock.countTimers()).to.equal(0);
  });

  it("keeps membership unknown on list failures while independently reading beacon data", async () => {
    validatorApi.getRemoteKeys.rejects(new Error("unavailable"));
    signerApi.listRemoteKeys.rejects(new Error("unavailable"));
    beaconchainApi.getStateValidator.callsFake(async ({ pubkey }) => beaconResponse(pubkey, "0x01" + "00".repeat(31)));
    const results = await read();
    expect(
      results.every(
        ({ signerImported, validatorImported, validatorFeeRecipientCorrect }) =>
          signerImported === undefined && validatorImported === undefined && validatorFeeRecipientCorrect === undefined
      )
    ).to.equal(true);
    expect(results.map(({ index }) => index)).to.deep.equal(keys.map((_, index) => String(index)));
  });
});

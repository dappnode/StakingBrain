import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrainDataBase } from "../../../src/modules/db/index.js";
import { ValidatorApi, Web3SignerApi } from "../../../src/modules/apiClients/index.js";
import { getValidators, LIST_DEADLINE_MS } from "../../../src/modules/apiServers/ui/calls/getValidators.js";
import { BeaconStatusStore } from "../../../src/modules/beaconStatus/index.js";
import logger from "../../../src/modules/logger/index.js";
import { emptyBeacon } from "../../helpers/beacon.js";

const keys = Array.from({ length: 30 }, (_, index) => "0x" + (index + 1).toString(16).padStart(96, "0"));
const feeRecipient = "0x" + "ab".repeat(20);
const hang = ({ signal }: { signal?: AbortSignal }) =>
  new Promise<never>((_resolve, reject) => {
    signal!.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  });

describe("Validator list reads", () => {
  let directory: string;
  let brainDb: BrainDataBase;
  let validatorApi: sinon.SinonStubbedInstance<ValidatorApi>;
  let signerApi: sinon.SinonStubbedInstance<Web3SignerApi>;
  let beaconStatus: BeaconStatusStore;

  beforeEach(() => {
    sinon.stub(logger, "error");
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-list-"));
    brainDb = new BrainDataBase(path.join(directory, "db.json"));
    brainDb.addValidators({
      validators: Object.fromEntries(keys.map((key) => [key, { tag: "solo", feeRecipient, automaticImport: false }]))
    });
    validatorApi = sinon.createStubInstance(ValidatorApi);
    signerApi = sinon.createStubInstance(Web3SignerApi);
    beaconStatus = new BeaconStatusStore(brainDb, emptyBeacon());
    validatorApi.getRemoteKeys.resolves({ data: keys.map((pubkey) => ({ pubkey, readonly: false, url: "" })) });
    signerApi.listRemoteKeys.resolves({
      data: keys.map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    validatorApi.getFeeRecipient.resolves({ data: { ethaddress: feeRecipient.toUpperCase().replace("0X", "0x") } });
  });
  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const list = () => getValidators({ brainDb, validatorApi, signerApi, beaconStatus });

  it("reads membership and fee recipients from the clients", async () => {
    validatorApi.getFeeRecipient.withArgs(keys[1]).resolves({ data: { ethaddress: "0x" + "00".repeat(20) } });
    signerApi.listRemoteKeys.resolves({ data: [] });
    const rows = await list();
    expect(rows.every(({ signerImported }) => signerImported === false)).to.equal(true);
    expect(rows.every(({ validatorImported }) => validatorImported)).to.equal(true);
    expect(rows.map(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect).slice(0, 3)).to.deep.equal([
      true,
      false,
      true
    ]);
    expect(rows.every(({ detailsPending, detailsError }) => !detailsPending && !detailsError)).to.equal(true);
  });

  it("bounds reads by concurrency and deadline and reports cut-off rows as pending", async () => {
    const clock = sinon.useFakeTimers();
    validatorApi.getFeeRecipient.callsFake(((_pubkey: string, signal?: AbortSignal) => hang({ signal })) as never);
    const rows = list();
    await clock.tickAsync(LIST_DEADLINE_MS - 1);
    expect(validatorApi.getFeeRecipient.callCount).to.equal(8);
    await clock.tickAsync(1);
    const result = await rows;
    expect(result.every(({ detailsPending, detailsError }) => detailsPending && !detailsError)).to.equal(true);
    expect(clock.countTimers()).to.equal(0);
  });

  it("converges over follow-up requests: only unread rows are pending", async () => {
    const clock = sinon.useFakeTimers();
    validatorApi.getFeeRecipient.callsFake(
      ((_pubkey: string, signal?: AbortSignal) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve({ data: { ethaddress: feeRecipient } }), 4000);
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("Aborted"));
          });
        })) as never
    );
    const pendingByRound: number[] = [];
    for (let round = 0; round < 3; round++) {
      const rows = list();
      await clock.tickAsync(LIST_DEADLINE_MS);
      const result = await rows;
      const pending = result.filter(({ detailsPending }) => detailsPending);
      // Pending means exactly "not read yet".
      expect(pending.every(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect === undefined)).to.equal(
        true
      );
      pendingByRound.push(pending.length);
    }
    expect(pendingByRound).to.deep.equal([14, 0, 0]);
  });

  it("moves past reads that time out, so responsive validators are not starved", async () => {
    const clock = sinon.useFakeTimers();
    const stuck = new Set(keys.slice(0, 8));
    validatorApi.getFeeRecipient.callsFake(((pubkey: string, signal?: AbortSignal) =>
      stuck.has(pubkey) ? hang({ signal }) : Promise.resolve({ data: { ethaddress: feeRecipient } })) as never);
    for (let round = 0; round < 2; round++) {
      const rows = list();
      await clock.tickAsync(LIST_DEADLINE_MS);
      await rows;
    }
    const rows = list();
    await clock.tickAsync(LIST_DEADLINE_MS);
    const result = await rows;
    expect(
      result
        .slice(8)
        .every(({ detailsPending, validatorFeeRecipientCorrect }) => !detailsPending && validatorFeeRecipientCorrect)
    ).to.equal(true);
    expect(result.slice(0, 8).every(({ detailsPending }) => detailsPending)).to.equal(true);
  });

  it("forgets a cached fee check when the key leaves the validator client", async () => {
    await list();
    validatorApi.getRemoteKeys.resolves({
      data: keys.slice(1).map((pubkey) => ({ pubkey, readonly: false, url: "" }))
    });
    await list();
    // The key returns, but its fee recipient was not restored.
    validatorApi.getRemoteKeys.resolves({ data: keys.map((pubkey) => ({ pubkey, readonly: false, url: "" })) });
    validatorApi.getFeeRecipient.withArgs(keys[0]).resolves({ data: { ethaddress: "0x" + "00".repeat(20) } });
    brainDb.notifyChanged();
    expect((await list())[0].validatorFeeRecipientCorrect).to.equal(false);
  });

  it("reports an unreachable client instead of an earlier success", async () => {
    await list();
    validatorApi.getRemoteKeys.rejects(new Error("ECONNREFUSED"));
    const rows = await list();
    expect(rows.every(({ validatorImported }) => validatorImported === undefined)).to.equal(true);
    expect(rows.every(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect === undefined)).to.equal(true);
    expect(rows.every(({ detailsPending }) => !detailsPending)).to.equal(true);
    expect(rows[0].detailsError).to.include("validator client").and.include("ECONNREFUSED");
  });

  it("reports a failed fee read for that row only", async () => {
    validatorApi.getFeeRecipient.withArgs(keys[0]).rejects(new Error("HTTP 404"));
    const rows = await list();
    expect(rows[0].detailsPending).to.equal(false);
    expect(rows[0].validatorFeeRecipientCorrect).to.equal(undefined);
    expect(rows[0].detailsError).to.include("HTTP 404");
    expect(rows.slice(1).every(({ detailsError }) => !detailsError)).to.equal(true);
  });

  it("re-reads a fee recipient checked mid-update once the update announces itself", async () => {
    const other = "0x" + "cd".repeat(20);
    brainDb.updateValidators([{ pubkey: keys[0], feeRecipient: other }]);
    let finishRead!: () => void;
    validatorApi.getFeeRecipient.withArgs(keys[0]).callsFake(
      () =>
        new Promise((resolve) => {
          finishRead = () => resolve({ data: { ethaddress: feeRecipient } });
        }) as never
    );
    const during = list();
    await new Promise((resolve) => setImmediate(resolve));
    validatorApi.getFeeRecipient.withArgs(keys[0]).resolves({ data: { ethaddress: other } });
    brainDb.notifyChanged();
    finishRead();
    expect((await during)[0].validatorFeeRecipientCorrect).to.equal(false);
    expect((await list())[0].validatorFeeRecipientCorrect).to.equal(true);
  });

  it("caches matching fee checks between requests and re-checks after an edit", async () => {
    await list();
    expect(validatorApi.getFeeRecipient.callCount).to.equal(keys.length);
    await list();
    expect(validatorApi.getFeeRecipient.callCount).to.equal(keys.length);
    brainDb.updateValidators([{ pubkey: keys[0], feeRecipient: "0x" + "cd".repeat(20) }]);
    const rows = await list();
    expect(validatorApi.getFeeRecipient.callCount).to.equal(keys.length + 1);
    expect(rows[0].validatorFeeRecipientCorrect).to.equal(false);
  });

  it("takes beacon details from the beacon store, pending until it has looked them up", async () => {
    const rows = await list();
    expect(rows.every(({ beaconPending, detailsPending }) => beaconPending && !detailsPending)).to.equal(true);
    await beaconStatus.refresh();
    expect((await list()).every(({ beaconPending }) => !beaconPending)).to.equal(true);
  });
});

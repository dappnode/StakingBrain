import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrainDataBase } from "../../../src/modules/db/index.js";
import type { BeaconchainApi } from "../../../src/modules/apiClients/index.js";
import { BEACON_CHUNK_SIZE, BeaconStatusStore } from "../../../src/modules/beaconStatus/index.js";
import logger from "../../../src/modules/logger/index.js";

const pubkeyAt = (index: number) => "0x" + (index + 1).toString(16).padStart(96, "0");
const credentials = "0x01" + "00".repeat(11) + "cd".repeat(20);
const response = (pubkeys: string[]) => ({
  execution_optimistic: false,
  finalized: true,
  data: pubkeys.map((pubkey) => ({
    index: String(parseInt(pubkey.slice(-6), 16) + 1000),
    status: "active_ongoing",
    validator: { pubkey, withdrawal_credentials: credentials }
  }))
});

describe("Beacon details store", () => {
  let directory: string;
  let brainDb: BrainDataBase;
  let beacon: { postStateValidators: sinon.SinonStub };
  let store: BeaconStatusStore;
  let notifications: sinon.SinonSpy;
  const keys = Array.from({ length: 3 }, (_, index) => pubkeyAt(index));
  const addKeys = (pubkeys: string[]) =>
    brainDb.addValidators({
      validators: Object.fromEntries(
        pubkeys.map((key) => [key, { tag: "solo", feeRecipient: "0x" + "ab".repeat(20), automaticImport: false }])
      )
    });
  const settle = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    sinon.stub(logger, "error");
    sinon.stub(logger, "warn");
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-beacon-"));
    brainDb = new BrainDataBase(path.join(directory, "db.json"));
    addKeys(keys);
    beacon = { postStateValidators: sinon.stub().callsFake(async ({ body }) => response(body.ids)) };
    store = new BeaconStatusStore(brainDb, beacon as unknown as BeaconchainApi);
    notifications = sinon.spy();
    brainDb.onChange(notifications);
  });
  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("reports validators as pending until looked up, then their index and credentials", async () => {
    expect(keys.map((key) => store.view(key).beaconPending)).to.deep.equal([true, true, true]);
    await store.refresh();
    const view = store.view(keys[0]);
    expect(view).to.deep.include({ index: "1001", beaconPending: false, beaconError: undefined });
    expect(view.withdrawalCredentials).to.deep.equal({ address: credentials, format: "ecdsa" });
    expect(notifications.called).to.equal(true);
  });

  it("persists indexes so the Brain API can serve them", async () => {
    await store.refresh();
    expect(Object.values(brainDb.getData()).map(({ index }) => index)).to.deep.equal([1001, 1002, 1003]);
  });

  it("looks up large key sets in chunks", async () => {
    addKeys(Array.from({ length: 1200 }, (_, index) => pubkeyAt(index + 10)));
    await settle();
    beacon.postStateValidators.resetHistory();
    await store.refresh();
    expect(beacon.postStateValidators.getCalls().map(({ args }) => args[0].body.ids.length)).to.deep.equal([
      BEACON_CHUNK_SIZE,
      BEACON_CHUNK_SIZE,
      1203 - 2 * BEACON_CHUNK_SIZE
    ]);
  });

  it("treats validators unknown to the beacon chain as complete", async () => {
    beacon.postStateValidators.callsFake(async ({ body }) => response(body.ids.slice(1)));
    await store.refresh();
    expect(store.view(keys[0])).to.deep.include({ index: undefined, beaconPending: false, beaconError: undefined });
    expect(store.view(keys[0]).withdrawalCredentials.format).to.equal("error");
  });

  it("reports a failed lookup, keeps earlier results, and recovers", async () => {
    beacon.postStateValidators.rejects(new Error("socket hang up"));
    await store.refresh();
    expect(store.view(keys[0])).to.deep.include({ beaconPending: false });
    expect(store.view(keys[0]).beaconError).to.include("socket hang up");

    beacon.postStateValidators.callsFake(async ({ body }) => response(body.ids));
    await store.refresh();
    expect(store.view(keys[0])).to.deep.include({ index: "1001", beaconError: undefined });

    beacon.postStateValidators.rejects(new Error("socket hang up"));
    await store.refresh();
    expect(store.view(keys[0])).to.deep.include({ index: "1001", beaconError: undefined });
  });

  it("looks up validators added to the database, without looping on failures", async () => {
    await store.refresh();
    beacon.postStateValidators.resetHistory();
    beacon.postStateValidators.rejects(new Error("syncing"));
    addKeys([pubkeyAt(50)]);
    await settle();
    await settle();
    // One lookup for the new key; its announced failure must not trigger another.
    expect(beacon.postStateValidators.getCalls().map(({ args }) => args[0].body.ids)).to.deep.equal([[pubkeyAt(50)]]);
    expect(store.view(pubkeyAt(50)).beaconError).to.include("syncing");
  });

  it("merges overlapping refreshes into one follow-up", async () => {
    let release!: () => void;
    beacon.postStateValidators.onFirstCall().callsFake(
      ({ body }) =>
        new Promise((resolve) => {
          release = () => resolve(response(body.ids));
        })
    );
    const runs = [store.refresh([keys[0]]), store.refresh([keys[1]]), store.refresh([keys[2]])];
    release();
    await Promise.all(runs);
    expect(beacon.postStateValidators.getCalls().map(({ args }) => args[0].body.ids)).to.deep.equal([
      [keys[0]],
      [keys[1], keys[2]]
    ]);
  });
});

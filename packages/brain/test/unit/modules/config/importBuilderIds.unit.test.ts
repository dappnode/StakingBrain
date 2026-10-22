import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sinon from "sinon";
import { BuilderConfig, Network } from "@stakingbrain/common";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import { importBuilderIds } from "../../../../src/modules/config/importBuilderIds.js";

const keys = ["11", "22", "33", "44"].map((byte) => "0x" + byte.repeat(48));
const recipient = "0x" + "ab".repeat(20);
const config: BuilderConfig = {
  builders: [{ url: "https://hoodi.aestus.live" }, { url: "https://boost-relay-hoodi.flashbots.net" }]
};

describe("One-time MEV-Boost builder settings import", () => {
  let directory: string;
  let dbPath: string;
  let markerPath: string;
  let brainDb: BrainDataBase;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-builder-import-"));
    dbPath = path.join(directory, "brain-db.json");
    markerPath = path.join(directory, "builder-config-imported");
    brainDb = new BrainDataBase(dbPath);
    brainDb.addValidators({
      validators: Object.fromEntries(
        keys.slice(0, 3).map((pubkey) => [pubkey, { tag: "solo", feeRecipient: recipient, automaticImport: false }])
      )
    });
  });

  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const run = (brainDb: BrainDataBase, markerPath: string, builderIds = "aestus,flashbots") =>
    importBuilderIds({ builderIds, network: Network.Hoodi, brainDb, markerPath });

  it("does nothing without builder IDs", () => {
    const before = fs.readFileSync(dbPath, "utf8");
    for (const builderIds of [undefined, "", " \n ", ", ,"]) {
      expect(importBuilderIds({ builderIds, network: Network.Hoodi, brainDb, markerPath })).to.equal(undefined);
    }
    expect(fs.existsSync(markerPath)).to.equal(false);
    expect(fs.readFileSync(dbPath, "utf8")).to.equal(before);
  });

  it("persists exact settings for unmanaged validators and preserves existing choices and resets", () => {
    brainDb.updateValidators([
      { pubkey: keys[1], builderConfig: {} },
      { pubkey: keys[2], builderConfig: null }
    ]);
    const before = brainDb.getData();
    expect(run(brainDb, markerPath)).to.deep.equal({ imported: 1, skipped: 2 });
    const persisted = new BrainDataBase(dbPath).getData();
    expect(persisted[keys[0]]).to.deep.equal({ ...before[keys[0]], builderConfig: config });
    expect(persisted[keys[1]]).to.deep.equal(before[keys[1]]);
    expect(persisted[keys[2]]).to.deep.equal(before[keys[2]]);
    expect(fs.statSync(markerPath).mode & 0o777).to.equal(0o600);
    expect(fs.readFileSync(markerPath, "utf8")).to.equal("");
  });

  it("ignores retained, changed and invalid IDs after a restart and never configures future keys", () => {
    expect(run(brainDb, markerPath)).to.deep.equal({ imported: 3, skipped: 0 });
    brainDb.updateValidators([
      { pubkey: keys[0], builderConfig: { builders: [] } },
      { pubkey: keys[1], builderConfig: null }
    ]);
    brainDb.addValidators({
      validators: { [keys[3]]: { tag: "solo", feeRecipient: recipient, automaticImport: false } }
    });
    const before = fs.readFileSync(dbPath, "utf8");
    const restarted = new BrainDataBase(dbPath);
    for (const input of ["aestus,flashbots", "titan", "unknown"]) {
      expect(run(restarted, markerPath, input)).to.equal(undefined);
      expect(fs.readFileSync(dbPath, "utf8")).to.equal(before);
    }
    expect(restarted.getData()[keys[3]].builderConfig).to.equal(undefined);
  });

  it("marks an empty database complete without setting defaults for future keys", () => {
    brainDb.deleteValidators(keys.slice(0, 3));
    expect(run(brainDb, markerPath)).to.deep.equal({ imported: 0, skipped: 0 });
    brainDb.addValidators({
      validators: { [keys[3]]: { tag: "solo", feeRecipient: recipient, automaticImport: false } }
    });
    expect(run(brainDb, markerPath)).to.equal(undefined);
    expect(brainDb.getData()[keys[3]].builderConfig).to.equal(undefined);
  });

  it("completes without rewriting the database when every validator already has settings", () => {
    brainDb.updateValidators(keys.slice(0, 3).map((pubkey) => ({ pubkey, builderConfig: null })));
    const update = sinon.spy(brainDb, "updateValidators");
    expect(run(brainDb, markerPath)).to.deep.equal({ imported: 0, skipped: 3 });
    expect(update.called).to.equal(false);
    expect(fs.existsSync(markerPath)).to.equal(true);
  });

  it("rejects unknown IDs without partially applying a list", () => {
    const before = fs.readFileSync(dbPath, "utf8");
    const inputs = ["unknown", "aestus,unknown", "https://hoodi.aestus.live"];
    for (const input of inputs) {
      expect(() => run(brainDb, markerPath, input)).to.throw();
      expect(fs.existsSync(markerPath)).to.equal(false);
      expect(fs.readFileSync(dbPath, "utf8")).to.equal(before);
    }
    expect(run(brainDb, markerPath)).to.deep.equal({ imported: 3, skipped: 0 });
  });

  it("uses the active network without falling back to Hoodi presets", () => {
    for (const network of [Network.Mainnet, Network.Gnosis, Network.Lukso]) {
      expect(() => importBuilderIds({ builderIds: "aestus", network, brainDb, markerPath })).to.throw(
        `BUILDER_IDS contains an unknown builder ID for ${network}`
      );
      expect(fs.existsSync(markerPath)).to.equal(false);
      expect(brainDb.getData()[keys[0]].builderConfig).to.equal(undefined);
    }
  });

  it("trims IDs and ignores duplicates and empty entries", () => {
    run(brainDb, markerPath, " aestus, flashbots,aestus, ,");
    expect(brainDb.getData()[keys[0]].builderConfig).to.deep.equal(config);
  });

  it("does not consume the import if the database write fails", () => {
    const before = fs.readFileSync(dbPath, "utf8");
    const update = sinon.stub(brainDb, "updateValidators").throws(new Error("disk full"));
    expect(() => run(brainDb, markerPath)).to.throw("disk full");
    expect(fs.existsSync(markerPath)).to.equal(false);
    expect(fs.readFileSync(dbPath, "utf8")).to.equal(before);
    update.restore();
    expect(run(brainDb, markerPath)).to.deep.equal({ imported: 3, skipped: 0 });
  });

  it("preserves edits when retrying after the database was saved but marker creation failed", () => {
    markerPath = path.join(directory, "missing", "import.json");
    expect(() => run(brainDb, markerPath)).to.throw();
    expect(fs.existsSync(markerPath)).to.equal(false);
    expect(brainDb.getData()[keys[0]].builderConfig).to.deep.equal(config);
    brainDb.updateValidators([{ pubkey: keys[0], builderConfig: { builders: [] } }]);
    fs.mkdirSync(path.dirname(markerPath));
    expect(run(new BrainDataBase(dbPath), markerPath)).to.deep.equal({ imported: 0, skipped: 3 });
    expect(brainDb.getData()[keys[0]].builderConfig).to.deep.equal({ builders: [] });
  });
});

import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import { Web3SignerApi, ValidatorApi } from "../../../../src/modules/apiClients/index.js";
import logger from "../../../../src/modules/logger/index.js";

describe("Validator database", () => {
  let directory: string;
  let filename: string;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-db-"));
    filename = path.join(directory, "db.json");
    sinon.stub(logger, "error");
  });
  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("migrates existing signer keys and their configured fee destination", async () => {
    const pubkey = "0x" + "ab".repeat(48);
    const feeRecipient = "0x" + "cd".repeat(20);
    const signer = sinon.createStubInstance(Web3SignerApi);
    signer.listRemoteKeys.resolves({ data: [{ validating_pubkey: pubkey, derivation_path: "", readonly: false }] });
    const validator = sinon.createStubInstance(ValidatorApi);
    validator.getFeeRecipient.withArgs(pubkey).resolves({ data: { pubkey, ethaddress: feeRecipient } });
    const db = new BrainDataBase(filename);
    await db.initialize(signer, validator);
    expect(db.getData()).to.deep.equal({ [pubkey]: { tag: "solo", feeRecipient, automaticImport: false } });
    expect(fs.statSync(filename).mode & 0o777).to.equal(0o600);
  });

  it("keeps populated records unchanged without contacting external services", async () => {
    const records = {
      ["0x" + "ab".repeat(48)]: {
        tag: "solo",
        feeRecipient: "0x" + "cd".repeat(20),
        automaticImport: false,
        builderConfig: {}
      }
    };
    fs.writeFileSync(filename, JSON.stringify(records));
    const signer = sinon.createStubInstance(Web3SignerApi);
    const validator = sinon.createStubInstance(ValidatorApi);
    const db = new BrainDataBase(filename);
    await db.initialize(signer, validator);
    expect(db.getData()).to.deep.equal(records);
    expect(signer.listRemoteKeys.called).to.equal(false);
    expect(validator.getBuilderConfig.called).to.equal(false);
  });

  it("applies partial update records without persisting pubkeys or erasing omitted settings", () => {
    const pubkey = "0x" + "ab".repeat(48);
    const original = {
      tag: "solo" as const,
      feeRecipient: "0x" + "cd".repeat(20),
      automaticImport: false,
      importPending: true,
      index: 42,
      builderConfig: { min_bid: "100" }
    };
    const db = new BrainDataBase(filename);
    db.addValidators({ validators: { [pubkey]: original } });

    db.updateValidators([{ pubkey, importPending: undefined, builderConfig: null }]);
    const saved = new BrainDataBase(filename).getData()[pubkey];
    expect(saved).to.deep.equal({
      tag: original.tag,
      feeRecipient: original.feeRecipient,
      automaticImport: original.automaticImport,
      index: original.index,
      builderConfig: null
    });

    db.updateValidators([{ pubkey, builderConfig: { builders: [] } }]);
    expect(db.getData()[pubkey].builderConfig).to.deep.equal({ builders: [] });
    expect(fs.statSync(filename).mode & 0o777).to.equal(0o600);
  });

  it("rejects invalid or duplicate update records before writing any part of the batch", () => {
    const pubkeys = ["ab", "cd"].map((byte) => "0x" + byte.repeat(48));
    const feeRecipient = "0x" + "11".repeat(20);
    const db = new BrainDataBase(filename);
    db.addValidators({
      validators: Object.fromEntries(
        pubkeys.map((pubkey) => [pubkey, { tag: "solo", feeRecipient, automaticImport: false }])
      )
    });
    const before = fs.readFileSync(filename, "utf8");

    expect(() =>
      db.updateValidators([
        { pubkey: pubkeys[0], builderConfig: { builders: [] } },
        { pubkey: pubkeys[1], feeRecipient: "invalid" }
      ])
    ).to.throw("fee recipient is invalid");
    expect(fs.readFileSync(filename, "utf8")).to.equal(before);

    expect(() =>
      db.updateValidators([
        { pubkey: pubkeys[0], index: 1 },
        { pubkey: pubkeys[0], index: 2 }
      ])
    ).to.throw("duplicate update");
    expect(fs.readFileSync(filename, "utf8")).to.equal(before);
  });

  it("refuses corrupted JSON without erasing validator metadata", async () => {
    fs.writeFileSync(filename, "{invalid JSON");
    const db = new BrainDataBase(filename);
    const result = await db
      .initialize(sinon.createStubInstance(Web3SignerApi), sinon.createStubInstance(ValidatorApi))
      .catch((error: Error) => error);
    expect(result).to.be.instanceOf(Error);
    expect(() => db.getData()).to.throw("refusing to reconcile");
    expect(fs.readFileSync(filename, "utf8")).to.equal("{invalid JSON");
  });

  it("refuses non-object JSON rather than letting LowSync treat it as an empty database", () => {
    for (const contents of ["null", "false", "0", "[]", '"invalid"']) {
      fs.writeFileSync(filename, contents);
      expect(() => new BrainDataBase(filename).getData()).to.throw("refusing to reconcile");
      expect(fs.readFileSync(filename, "utf8")).to.equal(contents);
    }
  });

  it("preserves each validator's fee destination during migration", async () => {
    const keys = ["ab", "cd"].map((byte) => "0x" + byte.repeat(48));
    const recipients = ["11", "22"].map((byte) => "0x" + byte.repeat(20));
    const signer = sinon.createStubInstance(Web3SignerApi);
    signer.listRemoteKeys.resolves({
      data: keys.map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
    });
    const validator = sinon.createStubInstance(ValidatorApi);
    keys.forEach((key, index) =>
      validator.getFeeRecipient.withArgs(key).resolves({ data: { ethaddress: recipients[index] } })
    );
    const db = new BrainDataBase(filename);
    await db.initialize(signer, validator);
    expect(keys.map((key) => db.getData()[key].feeRecipient)).to.deep.equal(recipients);
  });

  it("fails startup after migration retries instead of treating unavailable signers as empty", async () => {
    const clock = sinon.useFakeTimers();
    const signer = sinon.createStubInstance(Web3SignerApi);
    signer.listRemoteKeys.rejects(new Error("Signer unavailable"));
    const db = new BrainDataBase(filename);
    const pending = db.initialize(signer, sinon.createStubInstance(ValidatorApi)).catch((error: Error) => error);
    await clock.runAllAsync();
    expect(await pending).to.be.instanceOf(Error);
    expect(signer.listRemoteKeys.callCount).to.equal(10);
  });

  it("never guesses a burn address when an existing key's fee recipient cannot be read", async () => {
    const clock = sinon.useFakeTimers();
    const signer = sinon.createStubInstance(Web3SignerApi);
    const key = "0x" + "ab".repeat(48);
    signer.listRemoteKeys.resolves({ data: [{ validating_pubkey: key, derivation_path: "", readonly: false }] });
    const validator = sinon.createStubInstance(ValidatorApi);
    validator.getFeeRecipient.rejects(new Error("Client unavailable"));
    const db = new BrainDataBase(filename);
    const pending = db.initialize(signer, validator).catch((error: Error) => error);
    await clock.runAllAsync();
    expect(await pending).to.be.instanceOf(Error);
    expect(JSON.parse(fs.readFileSync(filename, "utf8"))).to.deep.equal({});
    expect(validator.setFeeRecipient.called).to.equal(false);
  });
});

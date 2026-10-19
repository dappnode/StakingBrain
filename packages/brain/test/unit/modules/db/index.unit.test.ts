import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import { Web3SignerApi, ValidatorApi } from "../../../../src/modules/apiClients/index.js";
import logger from "../../../../src/modules/logger/index.js";

describe("Database initialization", () => {
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

  it("recovers corrupted JSON as a valid empty database", async () => {
    fs.writeFileSync(filename, "{invalid JSON");
    const db = new BrainDataBase(filename);
    await db.initialize(sinon.createStubInstance(Web3SignerApi), sinon.createStubInstance(ValidatorApi));
    expect(db.getData()).to.deep.equal({});
    expect(JSON.parse(fs.readFileSync(filename, "utf8"))).to.deep.equal({});
  });
});

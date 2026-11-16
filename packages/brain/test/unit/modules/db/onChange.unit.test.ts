import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import logger from "../../../../src/modules/logger/index.js";
import { withValidatorOperationLock } from "../../../../src/modules/db/withValidatorOperationLock.js";

describe("Database change notifications", () => {
  let directory: string;
  let brainDb: BrainDataBase;
  const pubkey = "0x" + "11".repeat(48);
  const record = { tag: "solo" as const, feeRecipient: "0x" + "ab".repeat(20), automaticImport: false };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-change-"));
    brainDb = new BrainDataBase(path.join(directory, "db.json"));
    sinon.stub(logger, "warn");
    sinon.stub(logger, "error");
  });
  afterEach(() => {
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("notifies after persisted changes only, until unsubscribed", () => {
    const listener = sinon.spy();
    const unsubscribe = brainDb.onChange(listener);
    brainDb.addValidators({ validators: { [pubkey]: { ...record } } });
    expect(listener.callCount).to.equal(1);
    // A delete of an unknown key writes nothing, so it must not trigger UI refreshes.
    brainDb.deleteValidators(["0x" + "22".repeat(48)]);
    expect(listener.callCount).to.equal(1);
    unsubscribe();
    brainDb.deleteValidators([pubkey]);
    expect(listener.callCount).to.equal(1);
  });

  it("sends one notification after a held operation, and none if nothing changed", () => {
    const listener = sinon.spy();
    brainDb.onChange(listener);
    const release = brainDb.holdChangeNotifications();
    const nested = brainDb.holdChangeNotifications();
    brainDb.addValidators({ validators: { [pubkey]: { ...record } } });
    brainDb.updateValidators([{ pubkey, feeRecipient: "0x" + "cd".repeat(20) }]);
    nested();
    expect(listener.callCount).to.equal(0);
    release();
    release();
    expect(listener.callCount).to.equal(1);
    brainDb.holdChangeNotifications()();
    expect(listener.callCount).to.equal(1);
  });

  it("defers notifications for the whole validator operation", async () => {
    const listener = sinon.spy();
    brainDb.onChange(listener);
    await withValidatorOperationLock(brainDb, async () => {
      brainDb.addValidators({ validators: { [pubkey]: { ...record } } });
      await new Promise((resolve) => setTimeout(resolve, 5));
      // Clients are configured after the write; nobody should have been told yet.
      expect(listener.callCount).to.equal(0);
    });
    expect(listener.callCount).to.equal(1);
  });

  it("keeps writing when a listener throws", () => {
    brainDb.onChange(() => {
      throw new Error("socket gone");
    });
    brainDb.addValidators({ validators: { [pubkey]: { ...record } } });
    expect(Object.keys(brainDb.getData())).to.deep.equal([pubkey]);
  });
});

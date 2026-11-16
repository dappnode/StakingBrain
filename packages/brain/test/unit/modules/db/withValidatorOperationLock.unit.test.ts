import { expect } from "chai";
import sinon from "sinon";
import type { BrainDataBase } from "../../../../src/modules/db/index.js";
import {
  ValidatorOperationBusyError,
  withValidatorOperationLock
} from "../../../../src/modules/db/withValidatorOperationLock.js";

describe("Validator operation lock", () => {
  afterEach(() => sinon.restore());

  it("keeps later operations behind the running one after a waiter is abandoned", async () => {
    const clock = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const brainDb = {} as BrainDataBase;
    const events: string[] = [];
    let finishFirst!: () => void;

    const first = withValidatorOperationLock(brainDb, async () => {
      events.push("first:start");
      await new Promise<void>((resolve) => (finishFirst = resolve));
      events.push("first:end");
    });
    const abandoned = withValidatorOperationLock(brainDb, async () => events.push("abandoned"), {
      maxWaitMs: 1000
    }).catch((error: Error) => error);
    const third = withValidatorOperationLock(brainDb, async () => events.push("third"));

    await clock.tickAsync(1000);
    expect(await abandoned).to.be.instanceOf(ValidatorOperationBusyError);
    expect(events).to.deep.equal(["first:start"]);

    clock.restore();
    finishFirst();
    await Promise.all([first, third]);
    expect(events).to.deep.equal(["first:start", "first:end", "third"]);
  });

  it("runs a bounded operation that acquires the lock in time", async () => {
    const brainDb = {} as BrainDataBase;
    expect(await withValidatorOperationLock(brainDb, async () => "done", { maxWaitMs: 1000 })).to.equal("done");
  });
});

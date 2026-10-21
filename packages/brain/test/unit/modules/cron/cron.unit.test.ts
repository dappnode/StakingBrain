import { expect } from "chai";
import sinon from "sinon";
import { CronJob } from "../../../../src/modules/cron/cron.js";
import logger from "../../../../src/modules/logger/index.js";

describe("Cron execution", () => {
  afterEach(() => sinon.restore());

  it("skips overlapping ticks, including across stop/start", async () => {
    const clock = sinon.useFakeTimers();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const job = sinon.stub().returns(gate);
    const cron = new CronJob(100, job);
    try {
      cron.start();
      await clock.tickAsync(100);
      cron.stop();
      cron.start();
      await clock.tickAsync(300);
      expect(job.callCount).to.equal(1);
      release();
      await clock.tickAsync(100);
      expect(job.callCount).to.equal(2);
    } finally {
      cron.stop();
    }
  });

  it("logs failures and still runs the next tick", async () => {
    const clock = sinon.useFakeTimers();
    const error = sinon.stub(logger, "error");
    const job = sinon.stub().rejects(new Error("Failed"));
    const cron = new CronJob(100, job);
    try {
      cron.start();
      await clock.tickAsync(200);
      expect(job.callCount).to.equal(2);
      expect(error.callCount).to.equal(2);
    } finally {
      cron.stop();
    }
  });
});

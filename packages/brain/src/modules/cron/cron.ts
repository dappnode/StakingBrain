import { setInterval, clearInterval } from "timers";
import logger from "../logger/index.js";

export class CronJob {
  private task: NodeJS.Timeout | null = null;
  private interval: number;

  constructor(interval: number, private jobFunction: () => Promise<void>) {
    if (interval <= 0) throw Error("Interval must be a positive number.");
    this.interval = interval;
  }

  public start(): void {
    if (this.task === null) {
      logger.info(`Starting cron job with interval ${this.interval}ms`);
      this.task = setInterval(async () => {
        await this.jobFunction();
      }, this.interval);
    } else
      logger.warn("Task is already running. Use restart to restart the job.");
  }

  public stop(): void {
    if (this.task !== null) {
      logger.info("Stopping cron job.");
      clearInterval(this.task);
      this.task = null;
    } else logger.warn("Task is not running.");
  }

  public restart(): void {
    this.stop();
    this.start();
  }
}

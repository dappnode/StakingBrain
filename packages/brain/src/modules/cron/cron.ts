import { setInterval, clearInterval } from "timers";
import logger from "../logger/index.js";

export class CronJob {
  private task: NodeJS.Timeout | null = null;
  private running = false;
  private interval: number;

  constructor(
    interval: number,
    private jobFunction: () => Promise<void>
  ) {
    if (interval <= 0) throw Error("Interval must be a positive number.");
    this.interval = interval;
  }

  public start(): void {
    if (this.task === null) {
      logger.info(`Starting cron job with interval ${this.interval}ms`);
      this.task = setInterval(() => void this.runNow(), this.interval);
    } else logger.warn("Task is already running. Use restart to restart the job.");
  }

  /** Run the job now unless a run is already in progress; a slow run must not queue more copies. */
  public async runNow(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.jobFunction();
    } catch (error) {
      logger.error("Error running cron job", error);
    } finally {
      this.running = false;
    }
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

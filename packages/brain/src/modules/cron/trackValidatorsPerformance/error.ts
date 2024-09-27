import { CronError } from "../error.js";

export class TrackValidatorPerformanceCronError extends CronError {
  constructor(message: string) {
    super(message);
    this.name = "TrackValidatorPerformanceCronError";
  }
}

export class NodeSyncingError extends TrackValidatorPerformanceCronError {
  constructor(message: string) {
    super(message);
    this.name = "NodeSyncingError";
  }
}

export class ExecutionOfflineError extends TrackValidatorPerformanceCronError {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionOfflineError";
  }
}

class Logger {
  private static instance: Logger;
  private logLevel: string;

  private constructor() {
    this.logLevel = process.env.LOG_LEVEL || "debug";
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(message: string | object | null): void {
    if (
      this.logLevel === "debug" ||
      this.logLevel === "info" ||
      this.logLevel === "warn" ||
      this.logLevel === "error"
    ) {
      const debugColor = "\x1b[90m%s\x1b[0m";
      console.log(
        `${debugColor}[DEBUG]${debugColor} ${this.parseMessage(message)}`
      );
    }
  }

  info(message: string | object | null): void {
    if (
      this.logLevel === "info" ||
      this.logLevel === "warn" ||
      this.logLevel === "error"
    ) {
      const infoColor = "\x1b[34m%s\x1b[0m";
      console.log(
        `${infoColor}[INFO]${infoColor} ${this.parseMessage(message)}`
      );
    }
  }

  warn(message: string | object | null): void {
    if (this.logLevel === "warn" || this.logLevel === "error") {
      const warnColor = "\x1b[33m%s\x1b[0m";
      console.log(
        `${warnColor}[WARN]${warnColor} ${this.parseMessage(message)}`
      );
    }
  }

  error(message: string | object | null): void {
    if (this.logLevel === "error") {
      const errorColor = "\x1b[31m%s\x1b[0m";
      console.log(
        `${errorColor}[ERROR]${errorColor} ${this.parseMessage(message)}`
      );
    }
  }

  private parseMessage(message: string | object | null): string {
    if (typeof message === "string") return message;
    if (typeof message === "object") return JSON.stringify(message, null, 2);
    return message;
  }
}

const logger = Logger.getInstance();
export default logger;

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
    if (this.print("debug")) {
      const debugColor = "\x1b[90m\x1b[0m";
      console.log(`${debugColor}[DEBUG]${debugColor} ${this.parseMessage(message)}`);
    }
  }

  info(message: string | object | null): void {
    if (this.print("info")) {
      const infoColor = "\x1b[34m\x1b[0m";
      console.log(`${infoColor}[INFO]${infoColor} ${this.parseMessage(message)}`);
    }
  }

  warn(message: string | object | null): void {
    if (this.print("warn")) {
      const warnColor = "\x1b[33m\x1b[0m";
      console.log(`${warnColor}[WARN]${warnColor} ${this.parseMessage(message)}`);
    }
  }

  error(message: string | object | null, error?: Error): void {
    if (this.print("error")) {
      const errorColor = "\x1b[31m\x1b[0m";
      console.log(`${errorColor}[ERROR]${errorColor} ${this.parseMessage(message)}`);
      if (error) console.error(error);
    }
  }

  private parseMessage(message: string | object | null): string {
    if (typeof message === "string") return message;
    if (typeof message === "object") return JSON.stringify(message, null, 2);
    return message;
  }

  private print(logger: "debug" | "info" | "warn" | "error"): boolean {
    switch (this.logLevel) {
      case "debug":
        return true;
      case "info":
        return logger !== "debug";
      case "warn":
        return logger !== "debug" && logger !== "info";
      case "error":
        return logger !== "debug" && logger !== "info" && logger !== "warn";
      default:
        return false;
    }
  }
}

const logger = Logger.getInstance();
export default logger;

import type { ErrorCode, ErrnoException } from "./types.js";

export class ApiError extends Error {
  public code: ErrorCode;
  public errno: number;
  public path?: string;
  public syscall?: string;
  public hostname?: string;
  public address?: string;
  public port?: number;

  constructor(error: ErrnoException) {
    super(error.message);
    this.code = error.code || "UNKNOWN";
    this.errno = error.errno || -1;
    this.path = error.path;
    this.syscall = error.syscall;
    this.hostname = error.hostname;
    this.address = error.address;
    this.port = error.port;
  }
}

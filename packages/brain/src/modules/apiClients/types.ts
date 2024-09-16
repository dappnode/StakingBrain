export * from "./beaconchain/types.js";
export * from "./blockExplorer/types.js";
export * from "./signer/types.js";
export * from "./validator/types.js";

export interface CertFile {
  path: string;
  password: string;
}

export interface ApiParams {
  baseUrl: string;
  host?: string;
  apiPath?: string;
  authToken?: string;
  tlsCert?: Buffer | null;
}

export type AllowedMethods = "GET" | "POST" | "DELETE";

export interface ErrnoException extends Error {
  errno?: number;
  code?: ErrorCode;
  path?: string;
  syscall?: string;
  stack?: string;
  hostname?: string;
  address?: string;
  port?: number;
}

export type ErrorCode = "ETIMEDOUT" | "ENOTFOUND" | "ECONNREFUSED" | "ECONNRESET" | "ERR_HTTP" | "UNKNOWN";

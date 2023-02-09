export interface CertFile {
  path: string;
  password: string;
}

export interface ApiParams {
  baseUrl: string;
  host?: string;
  apiPath?: string;
  authToken?: string;
  tlsCert?: Buffer;
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

export type ErrorCode =
  | "ENNOTFOUND"
  | "ECONNREFUSED"
  | "ECONNRESET"
  | "ERR_HTTP"
  | "UNKNOWN";

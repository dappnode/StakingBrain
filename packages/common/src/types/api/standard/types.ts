export interface CertFile {
  path: string;
  password: string;
}

export interface ApiParams {
  baseUrl: string;
  host?: string;
  apiPath?: string;
  authToken?: string;
  tls?: Buffer;
}

export type AllowedMethods = "GET" | "POST" | "DELETE";

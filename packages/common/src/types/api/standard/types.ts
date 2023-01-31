export interface CertFile {
  path: string;
  password: string;
}

export interface ApiParams {
  baseUrl: string;
  apiPath?: string;
  authToken?: string;
  certFile?: CertFile;
}

export type AllowedMethods = "GET" | "POST" | "DELETE";

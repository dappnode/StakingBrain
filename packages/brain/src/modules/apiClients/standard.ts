import https from "node:https";
import http from "node:http";
import { ApiError } from "./error.js";
import logger from "../logger/index.js";
import type { ApiParams, AllowedMethods, ErrnoException } from "./types.js";
import type { Network } from "@stakingbrain/common";

export class StandardApi {
  private useTls = false;
  private requestOptions: https.RequestOptions;
  protected network: Network;

  constructor(apiParams: ApiParams, network: Network) {
    const urlOptions = new URL(apiParams.baseUrl + (apiParams.apiPath || ""));

    this.network = network;

    this.requestOptions = {
      hostname: urlOptions.hostname,
      port: urlOptions.port,
      path: urlOptions.pathname,
      protocol: urlOptions.protocol
    };

    this.requestOptions.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + apiParams.authToken,
      ...(apiParams.host && { Host: apiParams.host })
    };

    if (apiParams.tlsCert) {
      this.requestOptions.pfx = apiParams.tlsCert;
      this.requestOptions.passphrase = "dappnode";
      this.useTls = true;
    }

    if (this.requestOptions.protocol?.includes("https")) this.useTls = true;
  }

  /**
   * Returns base URL in format http(s)://host:port
   */
  public getBaseUrl(): string {
    const { protocol, hostname, port } = this.requestOptions;
    return `${protocol}//${hostname}:${port || 80}`;
  }

  protected async request({
    method,
    endpoint,
    body,
    headers,
    timeout
  }: {
    method: AllowedMethods;
    endpoint: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<any> {
    let req: http.ClientRequest;
    this.requestOptions.method = method;
    this.requestOptions.path = endpoint;

    if (this.useTls) {
      this.requestOptions.rejectUnauthorized = false;
      req = https.request(this.requestOptions);
    } else req = http.request(this.requestOptions);

    if (timeout) {
      req.setTimeout(timeout, () => {
        const error = new ApiError(`Request to ${endpoint} timed out`);
        req.destroy(error);
      });
    }

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        req.setHeader(key, value);
      }
    }

    if (body) {
      req.setHeader("Content-Length", Buffer.byteLength(body));
      req.write(body);
    }

    req.end();

    return new Promise(
      (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolve: (data?: any) => void | string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject: (error: any) => void | typeof ApiError
      ) => {
        req.on("error", (e: ErrnoException) => {
          reject(new ApiError(`Request to ${endpoint} failed with status code ${e.code}: ${e.message}. `));
        });

        req.on("response", (res) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any[] = [];

          res.on("data", (chunk) => {
            data.push(chunk);
          });

          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              if (data.length > 0) {
                try {
                  if (res.headers["content-type"] && res.headers["content-type"].includes("application/json"))
                    resolve(JSON.parse(Buffer.concat(data).toString()));
                  else resolve(Buffer.concat(data).toString());
                } catch (e) {
                  logger.error(
                    `Error parsing response from ${this.requestOptions.hostname} ${endpoint} ${e.message}. Considering the response as text`,
                    e
                  );
                  resolve(Buffer.concat(data).toString());
                }
              } else {
                resolve();
              }
            } else {
              let errorMessage = "";
              if (res.headers["content-type"] && res.headers["content-type"].includes("application/json")) {
                try {
                  // if its a error message in JSON we dont know the object format so print it in string format the whole error
                  errorMessage = Buffer.concat(data).toString();
                } catch (e) {
                  logger.error(
                    `Error parsing response from ${this.requestOptions.hostname} ${endpoint} ${e.message}`,
                    e
                  );
                }
              } else errorMessage = Buffer.concat(data).toString();

              reject(
                new ApiError(`Request to ${endpoint} failed with status code ${res.statusCode}: ${errorMessage}. `)
              );
            }
          });
          res.on("error", (e: ErrnoException) => {
            reject(new ApiError(`${e.message}. `));
          });
        });
      }
    );
  }
}

// Utility to append help message to error depending on error code
export function appendHelpMessage(errorMessage: string, errorCode: string, errno?: string, hostname?: string): string {
  if (errorCode === "ECONNREFUSED")
    errorMessage += `Connection refused by the server ${hostname}. Make sure the port is open and the server is running`;
  else if (errorCode === "ECONNRESET") errorMessage += `Connection reset by the server ${hostname}, check server logs`;
  else if (errorCode === "ENOTFOUND")
    errorMessage += `Host ${hostname} not found. Make sure the server is running and the hostname is correct`;
  else if (errorCode === "ERR_HTTP") errorMessage += `HTTP error code ${errno}`;

  return errorMessage;
}

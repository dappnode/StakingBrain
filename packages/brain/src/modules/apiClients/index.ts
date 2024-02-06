import https from "node:https";
import http from "node:http";
import {
  ApiParams,
  AllowedMethods,
  ErrnoException,
} from "@stakingbrain/common";
import { ApiError } from "./error.js";
import logger from "../logger/index.js";
import { network } from "../../index.js";

export class StandardApi {
  private useTls = false;
  private requestOptions: https.RequestOptions;

  constructor(apiParams: ApiParams) {
    const urlOptions = new URL(apiParams.baseUrl + (apiParams.apiPath || ""));

    this.requestOptions = {
      hostname: urlOptions.hostname,
      port: urlOptions.port,
      path: urlOptions.pathname,
      protocol: urlOptions.protocol,
    };

    this.requestOptions.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + apiParams.authToken,
      ...(apiParams.host && { Host: apiParams.host }),
    };

    if (apiParams.tlsCert) {
      this.requestOptions.pfx = apiParams.tlsCert;
      this.requestOptions.passphrase = "dappnode";
      this.useTls = true;
    }

    if (this.requestOptions.protocol?.includes("https")) this.useTls = true;
  }

  /*
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
    setOrigin = false
  }: {
    method: AllowedMethods,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any,
    setOrigin?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<any> {
    let req: http.ClientRequest;
    this.requestOptions.method = method;
    this.requestOptions.path = endpoint;

    if (this.useTls) {
      this.requestOptions.rejectUnauthorized = false;
      req = https.request(this.requestOptions);
    } else req = http.request(this.requestOptions);

    if (setOrigin)
      req.setHeader("Origin", network === "mainnet"
        ? "http://brain.web3signer.dappnode"
        : `http://brain.web3signer-${network}.dappnode`);

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
        reject: (error: any) => void | ApiError
      ) => {
        req.on("error", (e: ErrnoException) => {
          reject(
            new ApiError({
              name: e.name || "Standard ApiError",
              message: `${e.message}. ` || "",
              errno: e.errno || -1,
              code: e.code || "UNKNOWN",
              path: endpoint,
              syscall: method,
              hostname: this.requestOptions.hostname || undefined,
              address: e.address,
              port: e.port,
            })
          );
        });

        req.on("response", (res) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any[] = [];

          res.on("data", (chunk) => {
            data.push(chunk);
          });

          res.on("end", () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              if (data.length > 0) {
                try {
                  if (
                    res.headers["content-type"] &&
                    res.headers["content-type"].includes("application/json")
                  )
                    resolve(JSON.parse(Buffer.concat(data).toString()));
                  else resolve(Buffer.concat(data).toString());
                } catch (e) {
                  logger.error(
                    `Error parsing response from ${this.requestOptions.hostname} ${endpoint} ${e.message}`,
                    e
                  );
                  resolve(Buffer.concat(data).toString());
                }
              } else {
                resolve();
              }
            } else {
              let errorMessage = "";
              if (
                res.headers["content-type"] &&
                res.headers["content-type"].includes("application/json")
              ) {
                try {
                  errorMessage = JSON.parse(
                    Buffer.concat(data).toString()
                  )?.message;
                } catch (e) {
                  logger.error(
                    `Error parsing response from ${this.requestOptions.hostname} ${endpoint} ${e.message}`,
                    e
                  );
                }
              } else errorMessage = Buffer.concat(data).toString();

              reject(
                new ApiError({
                  name: "Standard ApiError",
                  message: errorMessage,
                  errno: res.statusCode,
                  code: "ERR_HTTP",
                  path: endpoint,
                  syscall: method,
                  hostname: this.requestOptions.hostname || undefined,
                })
              );
            }
          });
          res.on("error", (e: ErrnoException) => {
            reject(
              new ApiError({
                name: e.name || "Standard ApiError",
                message: `${e.message}. ` || "",
                errno: e.errno || -1,
                code: e.code || "UNKNOWN",
                path: endpoint,
                syscall: method,
                hostname: this.requestOptions.hostname || undefined,
                address: e.address,
                port: e.port,
              })
            );
          });
        });
      }
    );
  }
}

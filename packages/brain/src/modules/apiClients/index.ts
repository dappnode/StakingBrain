import https from "node:https";
import http from "node:http";
import {
  ApiParams,
  AllowedMethods,
  ErrnoException,
} from "@stakingbrain/common";
import { ApiError } from "./error.js";

export class StandardApi {
  private useTls = false;
  requestOptions: https.RequestOptions;

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
  }

  protected async request(
    method: AllowedMethods,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    let req: http.ClientRequest;
    this.requestOptions.method = method;
    this.requestOptions.path = endpoint;

    if (this.useTls) {
      this.requestOptions.rejectUnauthorized = false;
      req = https.request(this.requestOptions);
    } else req = http.request(this.requestOptions);

    if (body) {
      req.setHeader("Content-Length", Buffer.byteLength(body));
      req.write(body);
    }

    req.end();

    return new Promise((resolve, reject) => {
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
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode?.toString().startsWith("2")) {
            if (data) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                resolve("" + data); //Needed to parse from buffer to string
              }
            } else {
              resolve("OK");
            }
          } else {
            reject(
              new ApiError({
                name: "Standard ApiError",
                message: data,
                errno: res.statusCode,
                code: "ERR_HTTP",
                path: endpoint,
                syscall: method,
                hostname: this.requestOptions.hostname || undefined,
              })
            );
          }
        });
      });
    });
  }
}

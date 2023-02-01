import { readFileSync } from "fs";
import https from "node:https";
import http from "node:http";

import { ApiParams, AllowedMethods } from "@stakingbrain/common";

export class StandardApiClient {
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
    };

    //Check if both cert path and password are provided
    if (apiParams.certFile?.path && apiParams.certFile?.password) {
      try {
        this.requestOptions.pfx = readFileSync(apiParams.certFile.path);
        this.requestOptions.passphrase = readFileSync(
          apiParams.certFile.password
        ).toString();
      } catch (e) {
        console.log(
          "Error while reading certificate file or its password: " + e
        );
        throw e;
      }
    }
  }

  protected async request(
    method: AllowedMethods,
    endpoint: string,
    tls = false,
    body?: any
  ): Promise<any> {
    let req: http.ClientRequest;

    this.requestOptions.method = method;
    this.requestOptions.path = endpoint;

    if (tls) {
      //process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      this.requestOptions.rejectUnauthorized = false;

      req = https.request(this.requestOptions);
    } else {
      req = http.request(this.requestOptions);
    }

    if (body) {
      req.write(body);
    }

    req.on("error", (e) => {
      console.error(e);
    });

    req.end();

    return new Promise((resolve, reject) => {
      req.on("response", (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data = chunk;
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            console.log("Error while parsing response:" + e);
            reject("Error while parsing response:" + e);
          }
        });
      });
    });
  }
}

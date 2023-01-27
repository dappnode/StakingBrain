import { readFileSync } from "fs";
import https from "node:https";
import http from "node:http";

import {
  ApiParams,
  AllowedMethods,
} from "@stakingbrain/common/src/types/api/standard/types.js";

export class StandardApiClient {
  requestOptions: https.RequestOptions;

  constructor(apiParams: ApiParams) {
    this.requestOptions = new URL(apiParams.baseUrl + apiParams.apiPath);
    this.requestOptions.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    this.requestOptions.auth = "Bearer " + apiParams.authToken;

    if (apiParams.certFile) {
      this.requestOptions.pfx = readFileSync(apiParams.certFile.path);
      this.requestOptions.passphrase = apiParams.certFile.password;
    }
  }

  protected async request(
    method: AllowedMethods,
    endpoint: string,
    tls: boolean = false,
    body?: any
  ): Promise<any> {
    let req: http.ClientRequest;

    this.requestOptions.method = method;
    this.requestOptions.path += endpoint;

    if (tls) {
      this.requestOptions.rejectUnauthorized = false;

      req = https.request(this.requestOptions);
    } else {
      req = http.request(this.requestOptions);
    }

    if (body) {
      req.write(body);
    }

    req.end();

    return new Promise((resolve, reject) => {
      req.on("response", (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data = chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(data);
          }
        });
      });
    });
  }
}

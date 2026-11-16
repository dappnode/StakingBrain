import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { brotliCompressSync } from "node:zlib";
import { ConsensusClient, ExecutionClient, Network } from "@stakingbrain/common";
import { startBrainApi } from "../../../src/modules/apiServers/brain/startBrainApi.js";
import { startLaunchpadApi } from "../../../src/modules/apiServers/launchpad/startLaunchpadApi.js";
import { startUiServer } from "../../../src/modules/apiServers/ui/startUiServer.js";
import { BeaconchainApi, PostgresClient, ValidatorApi, Web3SignerApi } from "../../../src/modules/apiClients/index.js";
import { BrainDataBase } from "../../../src/modules/db/index.js";
import { CronJob } from "../../../src/modules/cron/cron.js";
import { params } from "../../../src/params.js";

function postJson(server: http.Server, body: Buffer, encoding?: string): Promise<number> {
  const address = server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path: "/",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": body.length,
          ...(encoding ? { "Content-Encoding": encoding } : {})
        }
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode!));
        response.on("error", reject);
      }
    );
    request.on("error", reject);
    request.end(body);
  });
}

describe("JSON request content encoding", () => {
  const servers = new Map<string, http.Server>();
  let directory: string;

  before(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-json-encoding-"));
    fs.writeFileSync(path.join(directory, "index.html"), "<html><head></head><body></body></html>");
    for (const port of ["brainPort", "launchpadPort", "uiPort"] as const) sinon.stub(params, port).value(0);
    const brainDb = sinon.createStubInstance(BrainDataBase);
    const validatorApi = sinon.createStubInstance(ValidatorApi);
    const signerApi = sinon.createStubInstance(Web3SignerApi);
    const beaconchainApi = sinon.createStubInstance(BeaconchainApi);
    const reloadValidatorsCronTask = sinon.createStubInstance(CronJob);
    const signerUrl = "http://127.0.0.1:1";
    const allowedOriginsFromEnv = null;
    servers.set("Brain", startBrainApi({ brainDb, allowedOriginsFromEnv }));
    servers.set(
      "Launchpad",
      startLaunchpadApi({
        brainDb,
        validatorApi,
        signerApi,
        beaconchainApi,
        reloadValidatorsCronTask,
        signerUrl,
        network: Network.Hoodi,
        allowedOriginsFromEnv
      })
    );
    servers.set(
      "UI",
      startUiServer({
        brainDb,
        validatorApi,
        signerApi,
        beaconchainApi,
        reloadValidatorsCronTask,
        postgresClient: sinon.createStubInstance(PostgresClient),
        uiBuildPath: directory,
        allowedOriginsFromEnv,
        brainConfig: {
          chain: {
            network: Network.Hoodi,
            executionClient: ExecutionClient.Geth,
            consensusClient: ConsensusClient.Teku,
            isMevBoostSet: false,
            minGenesisTime: 0,
            secondsPerSlot: 12,
            slotsPerEpoch: 32
          },
          apis: {
            signerUrl,
            validatorUrl: signerUrl,
            beaconchainUrl: signerUrl,
            executionClientUrl: signerUrl,
            prometheusUrl: signerUrl,
            dappmanagerUrl: signerUrl,
            postgresUrl: signerUrl,
            token: "",
            tlsCert: null,
            host: "localhost",
            cors: null
          }
        }
      })
    );
    await Promise.all([...servers.values()].map((server) => once(server, "listening")));
  });

  after(async () => {
    await Promise.all(
      [...servers.values()].map(
        (server) => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      )
    );
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  for (const name of ["Brain", "Launchpad", "UI"]) {
    it(`${name} rejects Brotli-compressed JSON with HTTP 415`, async () => {
      const body = brotliCompressSync(Buffer.from('{"probe":true}'));
      expect(await postJson(servers.get(name)!, body, "br")).to.equal(415);
    });

    it(`${name} lets identity JSON reach routing`, async () => {
      expect(await postJson(servers.get(name)!, Buffer.from('{"probe":true}'), "identity")).to.equal(404);
    });
  }
});

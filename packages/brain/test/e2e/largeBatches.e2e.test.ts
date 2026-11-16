import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import type http from "node:http";
import type { AddressInfo } from "node:net";
import { io, Socket } from "socket.io-client";
import { Network, VALIDATORS_CHANGED_EVENT } from "@stakingbrain/common";
import { BeaconchainApi, ValidatorApi, Web3SignerApi } from "../../src/modules/apiClients/index.js";
import { BrainDataBase } from "../../src/modules/db/index.js";
import { CronJob } from "../../src/modules/cron/cron.js";
import { reloadValidators } from "../../src/modules/cron/reloadValidators/index.js";
import { startUiServer } from "../../src/modules/apiServers/ui/startUiServer.js";
import type { BrainConfig } from "../../src/modules/config/types.js";
import logger from "../../src/modules/logger/index.js";
// The UI's own client code, so the test drives the Brain exactly as the browser does.
import { RpcClient } from "../../../ui/src/socket/rpcClient.js";
import {
  notAttempted,
  planImportBatches,
  retryableIndexes,
  runImportBatches,
  summarizeImport
} from "../../../ui/src/utils/importBatches.js";
import { countPending, MAX_STALLED_REFRESHES, nextStallCount } from "../../../ui/src/utils/validatorRefresh.js";
import type { CustomImportRequest } from "../../src/modules/apiServers/ui/calls/types.js";
import { FakeBeaconNode, FakeSigner, FakeValidatorClient } from "./fakeClients.js";

const feeRecipient = "0x" + "ab".repeat(20);
const pubkeyAt = (index: number) => "0x" + (index + 1).toString(16).padStart(96, "0");

function importRequest(pubkeys: string[], password = "password"): CustomImportRequest {
  return {
    importFrom: "ui",
    // One interchange covering every key, as users export it from their previous setup.
    slashing_protection: JSON.stringify({
      metadata: { interchange_format_version: "5", genesis_validators_root: "0x" + "00".repeat(32) },
      data: pubkeys.map((pubkey) => ({ pubkey, signed_blocks: [], signed_attestations: [] }))
    }),
    validatorsImportRequest: pubkeys.map((pubkey) => ({
      keystore: JSON.stringify({ version: 4, pubkey: pubkey.slice(2), crypto: { kdf: { function: "scrypt" } } }),
      password,
      tag: "solo",
      feeRecipient
    }))
  };
}

async function waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("E2E: large validator batches through the UI socket", function () {
  this.timeout(60_000);

  let directory: string;
  let signer: FakeSigner;
  let validator: FakeValidatorClient;
  let beacon: FakeBeaconNode;
  let closeFakes: (() => Promise<void>)[];
  let signerApi: Web3SignerApi;
  let validatorApi: ValidatorApi;
  let signerUrl: string;
  let brainDb: BrainDataBase;
  let cron: CronJob;
  let server: http.Server;
  let sockets: Socket[];
  let client: RpcClient;

  const connect = async (): Promise<{ socket: Socket; client: RpcClient }> => {
    const { port } = server.address() as AddressInfo;
    const socket = io(`http://127.0.0.1:${port}`, { transports: ["websocket"], reconnection: false });
    sockets.push(socket);
    const rpc = new RpcClient(socket);
    if (!socket.connected) await new Promise<void>((resolve) => socket.once("connect", () => resolve()));
    return { socket, client: rpc };
  };

  const importAll = (
    request: CustomImportRequest,
    pubkeys: string[],
    only?: number[],
    earlier?: { status: string }[]
  ) =>
    runImportBatches({
      batches: planImportBatches(request, pubkeys, { only }),
      results: earlier ?? pubkeys.map(notAttempted),
      importBatch: (batch) => client.call("importValidators", batch),
      onProgress: () => undefined,
      shouldStop: () => false
    });

  beforeEach(async () => {
    for (const level of ["debug", "info", "warn", "error"] as const) sinon.stub(logger, level);
    sinon.stub(console, "log");
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "stakingbrain-e2e-"));
    signer = new FakeSigner();
    validator = new FakeValidatorClient();
    beacon = new FakeBeaconNode();
    const [signerServer, validatorServer, beaconServer] = await Promise.all([
      signer.start(),
      validator.start(),
      beacon.start()
    ]);
    closeFakes = [signerServer.close, validatorServer.close, beaconServer.close];
    signerUrl = signerServer.url;
    signerApi = new Web3SignerApi({ baseUrl: signerServer.url, authToken: "token" }, Network.Hoodi);
    validatorApi = new ValidatorApi({ baseUrl: validatorServer.url, authToken: "token" }, Network.Hoodi);
    const beaconchainApi = new BeaconchainApi({ baseUrl: beaconServer.url }, Network.Hoodi);

    brainDb = new BrainDataBase(path.join(directory, "brain-db.json"));
    await brainDb.initialize(signerApi, validatorApi);
    cron = new CronJob(60_000, () => reloadValidators(signerApi, signerUrl, validatorApi, brainDb));
    cron.start();

    const uiBuildPath = path.join(directory, "ui");
    fs.mkdirSync(uiBuildPath);
    fs.writeFileSync(path.join(uiBuildPath, "index.html"), "<html><head></head><body></body></html>");
    server = startUiServer({
      brainDb,
      beaconchainApi,
      validatorApi,
      signerApi,
      postgresClient: {} as never,
      uiBuildPath,
      brainConfig: {
        chain: { network: Network.Hoodi, minGenesisTime: 0, secondsPerSlot: 12, isMevBoostSet: false },
        apis: { signerUrl, validatorUrl: validatorServer.url, beaconchainUrl: beaconServer.url }
      } as unknown as BrainConfig,
      reloadValidatorsCronTask: cron,
      allowedOriginsFromEnv: null,
      port: 0
    });
    if (!server.listening) await once(server, "listening");
    sockets = [];
    ({ client } = await connect());
  });

  afterEach(async () => {
    for (const socket of sockets) socket.disconnect();
    cron.stop();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await Promise.all(closeFakes.map((close) => close()));
    sinon.restore();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("imports 120 keystores in batches and configures every client", async () => {
    const pubkeys = Array.from({ length: 120 }, (_, index) => pubkeyAt(index));
    signer.importDelayPerKeyMs = 5;
    const { results, stopped } = await importAll(importRequest(pubkeys), pubkeys);

    expect(stopped).to.equal(undefined);
    expect(summarizeImport(results)).to.deep.equal({ imported: 120 });
    // Six bounded calls, each carrying only its own keys' slashing history.
    expect(signer.importRequests.map(({ pubkeys }) => pubkeys.length)).to.deep.equal([20, 20, 20, 20, 20, 20]);
    for (const { pubkeys: batch, slashingPubkeys } of signer.importRequests)
      expect(slashingPubkeys).to.deep.equal(batch);
    expect(signer.keys.size).to.equal(120);
    expect(validator.remoteKeys.size).to.equal(120);
    expect([...validator.remoteKeys.values()].every((url) => url === signerUrl)).to.equal(true);
    expect(validator.feeRecipients.size).to.equal(120);
    expect([...validator.feeRecipients.values()].every((address) => address === feeRecipient)).to.equal(true);
    const records = Object.values(brainDb.getData());
    expect(records).to.have.length(120);
    expect(records.some(({ importPending }) => importPending)).to.equal(false);

    // The reload job agrees with the result and removes nothing.
    await reloadValidators(signerApi, signerUrl, validatorApi, brainDb);
    expect(Object.keys(brainDb.getData())).to.have.length(120);
    expect(validator.remoteKeys.size).to.equal(120);
  });

  it("stops at a failed batch, keeps the journal, and a retry finishes the import", async () => {
    const pubkeys = Array.from({ length: 100 }, (_, index) => pubkeyAt(index));
    signer.failImportCall = 3;
    const first = await importAll(importRequest(pubkeys), pubkeys);

    expect(first.stopped).to.equal("error");
    expect(summarizeImport(first.results)).to.deep.equal({ imported: 40, error: 20, not_attempted: 40 });
    expect(first.results[45].message).to.include("500");
    // The failed batch stays journaled as pending, and reload must not delete those records.
    await reloadValidators(signerApi, signerUrl, validatorApi, brainDb);
    const pending = Object.values(brainDb.getData()).filter(({ importPending }) => importPending);
    expect(pending).to.have.length(20);

    const retry = retryableIndexes(first.results);
    expect(retry).to.have.length(60);
    const second = await importAll(importRequest(pubkeys), pubkeys, retry, first.results);
    expect(second.stopped).to.equal(undefined);
    expect(summarizeImport(second.results)).to.deep.equal({ imported: 100 });
    expect(signer.keys.size).to.equal(100);
    expect(validator.remoteKeys.size).to.equal(100);
    expect(validator.feeRecipients.size).to.equal(100);
    expect(Object.values(brainDb.getData()).some(({ importPending }) => importPending)).to.equal(false);
  });

  it("reports per-key signer rejections without failing the rest of the batch", async () => {
    const pubkeys = Array.from({ length: 30 }, (_, index) => pubkeyAt(index));
    const request = importRequest(pubkeys);
    request.validatorsImportRequest[25].password = "wrong";
    const { results, stopped } = await importAll(request, pubkeys);
    expect(stopped).to.equal(undefined);
    expect(summarizeImport(results)).to.deep.equal({ imported: 29, error: 1 });
    expect(results[25].message).to.include("password");
    expect(brainDb.getData()[pubkeys[25]]).to.equal(undefined);
    expect(retryableIndexes(results)).to.deep.equal([25]);
  });

  it("pushes validatorsChanged to other open UIs on import and delete", async () => {
    const watcher = await connect();
    let events = 0;
    watcher.client.on(VALIDATORS_CHANGED_EVENT, () => events++);
    const pubkeys = Array.from({ length: 45 }, (_, index) => pubkeyAt(index));
    await importAll(importRequest(pubkeys), pubkeys);
    await waitFor(() => events > 0);
    // Many database writes are coalesced into few hints rather than one per write.
    expect(events).to.be.lessThan(6);
    expect(await watcher.client.call("getValidators", undefined)).to.have.length(45);

    const before = events;
    await client.call("deleteValidators", { pubkeys: pubkeys.slice(0, 5) });
    await waitFor(() => events > before);
    expect(await watcher.client.call("getValidators", undefined)).to.have.length(40);
    expect(validator.remoteKeys.size).to.equal(40);
  });

  it("pushes a final update after slow validator-client writes so other UIs end up current", async () => {
    validator.writeDelayMs = 1500;
    const watcher = await connect();
    // Behave like the validator list: refresh on every push and keep the latest rows.
    let latest: Awaited<ReturnType<typeof watcher.client.call<"getValidators">>> = [];
    let refreshes = Promise.resolve();
    watcher.client.on(VALIDATORS_CHANGED_EVENT, () => {
      refreshes = refreshes.then(async () => {
        latest = await watcher.client.call("getValidators", undefined);
      });
    });
    const pubkeys = Array.from({ length: 10 }, (_, index) => pubkeyAt(index));
    await importAll(importRequest(pubkeys), pubkeys);
    // Let the last push and its refresh land.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await refreshes;
    expect(latest).to.have.length(10);
    expect(latest.every(({ validatorImported }) => validatorImported === true)).to.equal(true);
    expect(latest.every(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect === true)).to.equal(true);
  });

  it("loads a slow list progressively until every row is complete", async () => {
    const pubkeys = Array.from({ length: 70 }, (_, index) => pubkeyAt(index));
    await importAll(importRequest(pubkeys), pubkeys);
    pubkeys.forEach((pubkey, index) => beacon.indexes.set(pubkey, 1000 + index));
    // 8 parallel lookups of 1.5s cannot cover 70 validators inside the 10s list deadline.
    beacon.lookupDelayMs = 1500;

    // Refresh the way the validator list does until nothing is pending or progress stalls.
    const pendingByRound: number[] = [];
    let stalls = 0;
    let rows = await client.call("getValidators", undefined);
    pendingByRound.push(countPending(rows));
    while (countPending(rows) > 0 && stalls < MAX_STALLED_REFRESHES) {
      rows = await client.call("getValidators", undefined);
      stalls = nextStallCount(stalls, pendingByRound.at(-1), countPending(rows));
      pendingByRound.push(countPending(rows));
    }

    expect(pendingByRound[0]).to.be.greaterThan(0).and.lessThan(70);
    expect(pendingByRound.at(-1)).to.equal(0);
    expect(pendingByRound.length).to.be.at.most(3);
    expect(rows.map(({ index }) => index)).to.deep.equal(pubkeys.map((_, index) => String(1000 + index)));
    expect(rows.every(({ validatorFeeRecipientCorrect }) => validatorFeeRecipientCorrect === true)).to.equal(true);
    expect(rows.every(({ signerImported, validatorImported }) => signerImported && validatorImported)).to.equal(true);
  });

  it("keeps builder configuration switched off end to end", async () => {
    const pubkeys = [pubkeyAt(0)];
    await importAll(importRequest(pubkeys), pubkeys);
    const error = await client.call("getBuilderRelayPresets", undefined).catch((e: Error) => e);
    expect(error).to.be.instanceOf(Error).and.have.property("message").that.includes("disabled");
    const update = await client
      .call("updateValidators", [{ pubkey: pubkeys[0], builderConfig: null }])
      .catch((e: Error) => e);
    expect(update).to.be.instanceOf(Error).and.have.property("message").that.includes("disabled");
    await reloadValidators(signerApi, signerUrl, validatorApi, brainDb);
    expect(validator.paths.filter((p) => p.includes("builder_config"))).to.deep.equal([]);
    const [row] = await client.call("getValidators", undefined);
    expect(row).to.not.have.property("builderConfig");
  });
});

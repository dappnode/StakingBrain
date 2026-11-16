import { expect } from "chai";
import { RPC_MAX_PAYLOAD_BYTES } from "@stakingbrain/common";
import type { CustomImportRequest, Web3signerPostResponse } from "@stakingbrain/brain";
import {
  filterInterchange,
  ImportProgress,
  notAttempted,
  NOT_ATTEMPTED,
  planImportBatches,
  retryableIndexes,
  runImportBatches,
  summarizeImport
} from "../src/utils/importBatches.js";

const pubkeys = Array.from({ length: 45 }, (_, index) => "0x" + (index + 1).toString(16).padStart(96, "0"));
const interchange = JSON.stringify({
  metadata: { interchange_format_version: "5", genesis_validators_root: "0x" + "00".repeat(32) },
  data: pubkeys.map((pubkey) => ({ pubkey, signed_blocks: [], signed_attestations: [] }))
});
const request = (slashing?: string): CustomImportRequest => ({
  importFrom: "ui",
  slashing_protection: slashing,
  validatorsImportRequest: pubkeys.map((pubkey) => ({
    keystore: JSON.stringify({ pubkey: pubkey.slice(2) }),
    password: "password",
    tag: "solo",
    feeRecipient: "0x" + "ab".repeat(20)
  }))
});
const imported = (request: CustomImportRequest): Web3signerPostResponse => ({
  data: request.validatorsImportRequest.map(() => ({ status: "imported", message: "" }))
});

describe("Batched validator import", () => {
  it("splits by count, keeps file order and sends each batch only its own slashing history", () => {
    const batches = planImportBatches(request(interchange), pubkeys);
    expect(batches.map(({ indexes }) => indexes.length)).to.deep.equal([20, 20, 5]);
    expect(batches.flatMap(({ indexes }) => indexes)).to.deep.equal(pubkeys.map((_, index) => index));
    const second = JSON.parse(batches[1].request.slashing_protection!);
    expect(second.metadata.interchange_format_version).to.equal("5");
    expect(second.data.map(({ pubkey }: { pubkey: string }) => pubkey)).to.deep.equal(pubkeys.slice(20, 40));
  });

  it("splits by size so a batch stays under the transport limit", () => {
    const batches = planImportBatches(request(), pubkeys, { maxBytes: 1000 });
    expect(batches.every(({ indexes }) => indexes.length < 20)).to.equal(true);
    expect(batches.flatMap(({ indexes }) => indexes)).to.have.length(45);
  });

  it("counts each key's slashing history and JSON encoding toward the batch size", () => {
    // 4,000 attestations per key: twenty of these do not fit one RPC payload.
    const attestations = Array.from({ length: 4000 }, (_, epoch) => ({
      source_epoch: String(epoch),
      target_epoch: String(epoch + 1),
      signing_root: "0x" + "ab".repeat(32)
    }));
    const heavy = JSON.stringify({
      metadata: { interchange_format_version: "5", genesis_validators_root: "0x" + "00".repeat(32) },
      data: pubkeys.map((pubkey) => ({ pubkey, signed_blocks: [], signed_attestations: attestations }))
    });
    const batches = planImportBatches(request(heavy), pubkeys);
    expect(batches.length).to.be.greaterThan(Math.ceil(pubkeys.length / 20));
    expect(batches.flatMap(({ indexes }) => indexes)).to.deep.equal(pubkeys.map((_, index) => index));
    for (const { request: batch } of batches) {
      // The same framing the RPC client measures before sending.
      const rpcBytes = new TextEncoder().encode(
        JSON.stringify({ jsonrpc: "2.0", method: "importValidators", params: batch, id: Date.now() })
      ).byteLength;
      expect(rpcBytes + 64).to.be.at.most(RPC_MAX_PAYLOAD_BYTES);
    }
  });

  it("reports a key too large for any request and imports the rest", async () => {
    const huge = Array.from({ length: 60000 }, (_, epoch) => ({
      source_epoch: String(epoch),
      target_epoch: String(epoch + 1),
      signing_root: "0x" + "cd".repeat(32)
    }));
    const keys = pubkeys.slice(0, 3);
    const slashing = JSON.stringify({
      metadata: { interchange_format_version: "5", genesis_validators_root: "0x" + "00".repeat(32) },
      data: keys.map((pubkey, index) => ({
        pubkey,
        signed_blocks: [],
        signed_attestations: index === 1 ? huge : []
      }))
    });
    const full = request(slashing);
    const batches = planImportBatches(
      { ...full, validatorsImportRequest: full.validatorsImportRequest.slice(0, 3) },
      keys
    );
    const sent: number[][] = [];
    const { results, stopped } = await runImportBatches({
      batches,
      results: keys.map(notAttempted),
      importBatch: async (batch) => {
        sent.push(batch.validatorsImportRequest.map((_, i) => i));
        return imported(batch);
      },
      onProgress: () => undefined,
      shouldStop: () => false
    });
    expect(stopped).to.equal(undefined);
    expect(results.map(({ status }) => status)).to.deep.equal(["imported", "error", "imported"]);
    expect(results[1].message).to.include("too large");
    expect(sent).to.have.length(1);
  });

  it("leaves a malformed slashing file untouched for the signer to report", () => {
    expect(filterInterchange("{not json", new Set(pubkeys))).to.equal("{not json");
    expect(planImportBatches(request(), pubkeys)[0].request.slashing_protection).to.equal(undefined);
  });

  it("matches slashing entries regardless of 0x prefix and hex casing", () => {
    const data = JSON.stringify({ metadata: {}, data: [{ pubkey: pubkeys[0].slice(2).toUpperCase() }] });
    expect(JSON.parse(filterInterchange(data, new Set([pubkeys[0]]))).data).to.have.length(1);
  });

  it("reports progress after each batch and keeps results aligned with files", async () => {
    const progress: ImportProgress[] = [];
    const { results, stopped } = await runImportBatches({
      batches: planImportBatches(request(), pubkeys),
      results: pubkeys.map(notAttempted),
      importBatch: async (batch) => imported(batch),
      onProgress: (update) => progress.push(update),
      shouldStop: () => false
    });
    expect(stopped).to.equal(undefined);
    expect(progress.map(({ done }) => done)).to.deep.equal([0, 20, 40, 45]);
    expect(results.every(({ status }) => status === "imported")).to.equal(true);
  });

  it("stops after a failed batch and leaves the rest retryable", async () => {
    let calls = 0;
    const { results, stopped } = await runImportBatches({
      batches: planImportBatches(request(), pubkeys),
      results: pubkeys.map(notAttempted),
      importBatch: async (batch) => {
        if (++calls === 2) throw new Error("Connection lost or request timed out.");
        return imported(batch);
      },
      onProgress: () => undefined,
      shouldStop: () => false
    });
    expect(stopped).to.equal("error");
    expect(calls).to.equal(2);
    expect(summarizeImport(results)).to.deep.equal({ imported: 20, error: 20, [NOT_ATTEMPTED]: 5 });
    expect(results[25].message).to.include("timed out");
    expect(retryableIndexes(results)).to.deep.equal(pubkeys.map((_, index) => index).slice(20));
  });

  it("honours a stop request between batches", async () => {
    let stop = false;
    const { results, stopped } = await runImportBatches({
      batches: planImportBatches(request(), pubkeys),
      results: pubkeys.map(notAttempted),
      importBatch: async (batch) => {
        stop = true;
        return imported(batch);
      },
      onProgress: () => undefined,
      shouldStop: () => stop
    });
    expect(stopped).to.equal("user");
    expect(summarizeImport(results)).to.deep.equal({ imported: 20, [NOT_ATTEMPTED]: 25 });
  });

  it("retries only the requested files and keeps earlier results", async () => {
    const earlier = pubkeys.map((_, index) =>
      index < 40 ? { status: "imported", message: "" } : { status: "error", message: "boom" }
    );
    const sent: number[] = [];
    const { results } = await runImportBatches({
      batches: planImportBatches(request(), pubkeys, { only: retryableIndexes(earlier) }),
      results: earlier,
      importBatch: async (batch) => {
        sent.push(batch.validatorsImportRequest.length);
        return { data: batch.validatorsImportRequest.map(() => ({ status: "duplicate", message: "" })) };
      },
      onProgress: () => undefined,
      shouldStop: () => false
    });
    expect(sent).to.deep.equal([5]);
    expect(summarizeImport(results)).to.deep.equal({ imported: 40, duplicate: 5 });
  });

  it("marks keys without a returned result as errors instead of success", async () => {
    const { results } = await runImportBatches({
      batches: planImportBatches(request(), pubkeys.slice(0, 2), { only: [0, 1] }),
      results: [notAttempted(), notAttempted()],
      importBatch: async () => ({ data: [{ status: "imported", message: "" }] }),
      onProgress: () => undefined,
      shouldStop: () => false
    });
    expect(results.map(({ status }) => status)).to.deep.equal(["imported", "error"]);
  });
});

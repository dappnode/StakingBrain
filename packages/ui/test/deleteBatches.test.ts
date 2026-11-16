import { expect } from "chai";
import type { Web3signerDeleteResponse } from "@stakingbrain/brain";
import { notAttempted, summarize } from "../src/utils/batchRunner.js";
import {
  DELETE_BATCH_SIZE,
  mergeInterchanges,
  planDeleteBatches,
  retryableDeletes,
  runDeleteBatches
} from "../src/utils/deleteBatches.js";

const pubkeys = Array.from({ length: 60 }, (_, index) => "0x" + (index + 1).toString(16).padStart(96, "0"));
const metadata = { interchange_format_version: "5", genesis_validators_root: "0x" + "00".repeat(32) };
const signerDelete = (request: { pubkeys: string[] }): Web3signerDeleteResponse => ({
  data: request.pubkeys.map((pubkey) => ({ status: pubkey === pubkeys[5] ? "not_found" : "deleted", message: "" })),
  slashing_protection: JSON.stringify({ metadata, data: request.pubkeys.map((pubkey) => ({ pubkey })) })
});

describe("Batched validator deletion", () => {
  it("plans batches in selection order, or only the given positions for a retry", () => {
    expect(planDeleteBatches(pubkeys).map(({ indexes }) => indexes.length)).to.deep.equal([
      DELETE_BATCH_SIZE,
      DELETE_BATCH_SIZE,
      60 - 2 * DELETE_BATCH_SIZE
    ]);
    expect(planDeleteBatches(pubkeys, [3, 40]).map(({ request }) => request.pubkeys)).to.deep.equal([
      [pubkeys[3], pubkeys[40]]
    ]);
  });

  it("deletes in batches with progress, keeps results aligned and merges slashing history", async () => {
    const inFlight: number[] = [];
    const { results, stopped, slashingProtection } = await runDeleteBatches({
      batches: planDeleteBatches(pubkeys),
      results: pubkeys.map(notAttempted),
      deleteBatch: async (request) => signerDelete(request),
      onProgress: (progress, latest) => {
        if (progress.current) inFlight.push(latest.filter(({ status }) => status === "deleting").length);
      },
      shouldStop: () => false
    });
    expect(stopped).to.equal(undefined);
    expect(inFlight).to.deep.equal([25, 25, 10]);
    expect(summarize(results)).to.deep.equal({ deleted: 59, not_found: 1 });
    expect(results[5].status).to.equal("not_found");
    expect(retryableDeletes(results)).to.deep.equal([]);
    const [merged, ...rest] = mergeInterchanges(slashingProtection);
    expect(rest).to.deep.equal([]);
    expect(JSON.parse(merged)).to.deep.equal({ metadata, data: pubkeys.map((pubkey) => ({ pubkey })) });
  });

  it("stops at a failed batch, keeps the history already exported and offers the rest for retry", async () => {
    let calls = 0;
    const { results, stopped, slashingProtection } = await runDeleteBatches({
      batches: planDeleteBatches(pubkeys),
      results: pubkeys.map(notAttempted),
      deleteBatch: async (request) => {
        if (++calls === 2) throw new Error("Connection lost or request timed out.");
        return signerDelete(request);
      },
      onProgress: () => undefined,
      shouldStop: () => false
    });
    expect(stopped).to.equal("error");
    expect(summarize(results)).to.deep.equal({ deleted: 24, not_found: 1, error: 25, not_attempted: 10 });
    expect(retryableDeletes(results)).to.deep.equal(pubkeys.map((_, index) => index).slice(25));
    expect(JSON.parse(mergeInterchanges(slashingProtection)[0]).data).to.have.length(25);
  });

  it("honours a stop request between batches", async () => {
    let stop = false;
    const { results, stopped } = await runDeleteBatches({
      batches: planDeleteBatches(pubkeys),
      results: pubkeys.map(notAttempted),
      deleteBatch: async (request) => {
        stop = true;
        return signerDelete(request);
      },
      onProgress: () => undefined,
      shouldStop: () => stop
    });
    expect(stopped).to.equal("user");
    expect(summarize(results)).to.deep.equal({ deleted: 24, not_found: 1, not_attempted: 35 });
  });

  it("never drops slashing history it cannot merge", () => {
    const valid = JSON.stringify({ metadata, data: [{ pubkey: pubkeys[0] }] });
    expect(mergeInterchanges([valid, "{broken", valid])).to.deep.equal([
      JSON.stringify({ metadata, data: [{ pubkey: pubkeys[0] }, { pubkey: pubkeys[0] }] }),
      "{broken"
    ]);
    expect(mergeInterchanges([])).to.deep.equal([]);
  });
});

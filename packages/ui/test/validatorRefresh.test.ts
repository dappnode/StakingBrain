import { expect } from "chai";
import { countPending, nextStallCount, remapSelection } from "../src/utils/validatorRefresh.js";
import { incompleteImportIndexes } from "../src/utils/importForm.js";

const row = (pubkey: string, detailsPending?: boolean) => ({ pubkey, detailsPending });

describe("Live validator list refresh", () => {
  it("keeps the same validators selected when rows move or disappear", () => {
    const previous = [row("0xaa"), row("0xbb"), row("0xcc")];
    const next = [row("0xCC"), row("0xaa")];
    expect(remapSelection(previous, next, [0, 1, 2])).to.deep.equal([1, 0]);
  });

  it("clears the selection when there was no earlier list", () => {
    expect(remapSelection(undefined, [row("0xaa")], [0])).to.deep.equal([]);
  });

  it("counts pending rows and stops after refreshes that make no progress", () => {
    expect(countPending([row("0xaa", true), row("0xbb", false), row("0xcc")])).to.equal(1);
    expect(nextStallCount(0, undefined, 10)).to.equal(0);
    expect(nextStallCount(0, 10, 6)).to.equal(0);
    expect(nextStallCount(0, 6, 6)).to.equal(1);
    expect(nextStallCount(2, 6, 7)).to.equal(3);
    expect(nextStallCount(2, 6, 0)).to.equal(0);
  });
});

describe("Large import forms", () => {
  it("points at the files that still need input", () => {
    const acceptedFiles = ["a", "b", "c"].map((name) => ({ file: new File(["{}"], name), pubkey: "0x" + name }));
    expect(
      incompleteImportIndexes({
        acceptedFiles,
        passwords: ["pw", "", "pw"],
        tags: ["solo", "solo", ""],
        feeRecipients: ["0x" + "ab".repeat(20), "0x" + "ab".repeat(20), ""]
      })
    ).to.deep.equal([1, 2]);
  });
});

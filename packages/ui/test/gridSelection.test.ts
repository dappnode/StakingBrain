import { expect } from "chai";
import { selectedGridRowIds } from "../src/utils/dataUtils.js";

describe("Bulk validator selection", () => {
  const rows = [{ id: 0 }, { id: 1 }, { id: 2 }];
  it("uses only existing selected IDs for individual actions", () => {
    expect(selectedGridRowIds({ type: "include", ids: new Set([1, 99]) }, rows)).to.deep.equal([1]);
  });
  it("expands select-all exclusions to explicit IDs for bulk actions", () => {
    expect(selectedGridRowIds({ type: "exclude", ids: new Set([1]) }, rows)).to.deep.equal([0, 2]);
    expect(selectedGridRowIds({ type: "exclude", ids: new Set() }, rows)).to.deep.equal([0, 1, 2]);
  });
  it("clears bulk actions when the selection or validator list is empty", () => {
    expect(selectedGridRowIds({ type: "include", ids: new Set() }, rows)).to.deep.equal([]);
    expect(selectedGridRowIds({ type: "exclude", ids: new Set() }, [])).to.deep.equal([]);
  });
});

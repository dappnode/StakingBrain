import { expect } from "chai";
import { countUnfinished, nextStallCount } from "../src/utils/listFollowUp.js";

describe("Validator list follow-up requests", () => {
  it("counts only rows whose client reads were cut off", () => {
    expect(countUnfinished([{ detailsPending: true }, { detailsPending: false }, { detailsPending: true }])).to.equal(
      2
    );
  });

  it("stops after follow-ups that make no progress and resets on progress", () => {
    expect(nextStallCount(0, undefined, 10)).to.equal(0);
    expect(nextStallCount(0, 10, 6)).to.equal(0);
    expect(nextStallCount(0, 6, 6)).to.equal(1);
    expect(nextStallCount(2, 6, 7)).to.equal(3);
    expect(nextStallCount(2, 6, 0)).to.equal(0);
  });
});

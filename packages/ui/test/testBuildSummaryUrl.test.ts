import { expect } from "chai";
import buildValidatorSummaryURL from "../src/utils/buildValidatorSummaryURL.js";
import { blockExplorerUrls } from "../src/params.js";

describe("Validator dashboard URLs", () => {
  for (const [network, baseUrl] of [
    ["mainnet", "https://beaconcha.in"],
    ["hoodi", "https://hoodi.beaconcha.in"]
  ]) {
    it(`builds a ${network} link from local indexes, including index zero`, () => {
      expect(buildValidatorSummaryURL({ validatorIndexes: ["0", "42", "123"], network })).to.equal(
        `${baseUrl}/dashboard?validators=0,42,123`
      );
    });
  }

  // Their explorers would open an empty dashboard (Gnosis) or a missing page (Lukso).
  for (const network of ["gnosis", "lukso"]) {
    it(`builds no dashboard link for ${network}, whose explorer has no multi-validator dashboard`, () => {
      expect(buildValidatorSummaryURL({ validatorIndexes: ["0", "42"], network })).to.equal("");
    });
  }

  it("points Gnosis explorer links at a live explorer", () => {
    expect(blockExplorerUrls.get("gnosis")).to.equal("https://beaconchain.gnosischain.com");
  });

  it("includes selections larger than the former API batch limit", () => {
    const validatorIndexes = Array.from({ length: 103 }, (_, index) => index.toString());
    expect(buildValidatorSummaryURL({ validatorIndexes, network: "mainnet" })).to.equal(
      `https://beaconcha.in/dashboard?validators=${validatorIndexes.join(",")}`
    );
  });

  it("does not build a partial dashboard when a selected validator has no index", () => {
    expect(buildValidatorSummaryURL({ validatorIndexes: ["1", "", "3"], network: "mainnet" })).to.equal("");
  });

  it("does not build a dashboard for an empty selection", () => {
    expect(buildValidatorSummaryURL({ validatorIndexes: [], network: "mainnet" })).to.equal("");
  });

  it("rejects invalid indexes", () => {
    for (const index of ["-1", "1.5", "undefined", "1&validators=2"]) {
      expect(buildValidatorSummaryURL({ validatorIndexes: [index], network: "mainnet" })).to.equal("");
    }
  });

  it("rejects unsupported networks", () => {
    expect(() => buildValidatorSummaryURL({ validatorIndexes: ["1"], network: "unknown" })).to.throw(
      "Invalid network: unknown"
    );
  });
});

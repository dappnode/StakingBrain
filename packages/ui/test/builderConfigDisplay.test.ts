import { expect } from "chai";
import { BuilderConfig, defaultBuilderAuthData } from "@stakingbrain/common";
import {
  builderConfigComparison,
  formatBidAmount,
  formatBidBoost,
  MAX_BUILDER_BOOST
} from "../src/utils/builderConfigDisplay.js";

const url = "https://builder.example.com";

describe("Builder settings display", () => {
  it("labels maximum boost without displaying the uint64 sentinel and safely previews unfinished inputs", () => {
    expect(formatBidBoost(MAX_BUILDER_BOOST)).to.equal("MAX · Prefer builders");
    expect(formatBidBoost("0")).to.equal("0% · Prefer local");
    expect(formatBidBoost("100")).to.equal("100% · Equal weight");
    expect(formatBidBoost("150")).to.equal("150%");
    for (const value of ["", "1.5", "abc", "18446744073709551616"]) {
      expect(formatBidBoost(value)).to.include("Enter a valid");
      expect(formatBidAmount(value)).to.include("Enter a valid");
    }
    expect(formatBidAmount("9007199254740993")).to.equal(`${9007199254740993n.toLocaleString()} Gwei`);
  });

  it("shows saved inheritance alongside effective numbers without freezing defaults", () => {
    const saved: BuilderConfig = { min_bid: "25", builders: [{ url }] };
    const original = structuredClone(saved);
    const resolved: BuilderConfig = {
      min_bid: "25",
      builder_boost_factor: "100",
      builders: [{ url, min_bid: "25", builder_boost_factor: "100", max_execution_payment: "0" }]
    };
    const comparison = builderConfigComparison(saved, resolved);
    expect(comparison.rows[1]).to.deep.equal({
      label: "Bid boost",
      saved: "Client default",
      effective: "100% · Equal weight"
    });
    expect(comparison.builders[0].rows[0]).to.include({ saved: "Use global minimum bid", effective: "25 Gwei" });
    expect(comparison.builders[0].rows[1]).to.include({
      saved: "Use global bid boost",
      effective: "100% · Equal weight"
    });
    expect(saved).to.deep.equal(original);
  });

  it("matches reordered builder entries by exact URL and effective authorization bytes", () => {
    const saved: BuilderConfig = {
      builders: [
        { url, min_bid: "1" },
        { url, auth_data: "0xaB", min_bid: "2" }
      ]
    };
    const resolved: BuilderConfig = {
      builders: [
        { url, auth_data: "0xAb", min_bid: "2" },
        { url, auth_data: defaultBuilderAuthData(url).toUpperCase().replace("0X", "0x"), min_bid: "1" }
      ]
    };
    const comparison = builderConfigComparison(saved, resolved);
    expect(comparison.builders.map((entry) => entry.rows[0].effective)).to.deep.equal(["1 Gwei", "2 Gwei"]);
    expect(comparison.builders.map((entry) => entry.source)).to.deep.equal([undefined, undefined]);
    expect(comparison.builders[0].rows[3]).to.include({ saved: "Builder hostname", effective: "Builder hostname" });
  });

  it("distinguishes reset/defaults, no builders, stale client lists, and unavailable GET values", () => {
    const resolved = { builders: [{ url }] };
    for (const saved of [undefined, null, {}]) {
      const comparison = builderConfigComparison(saved, resolved);
      expect(comparison.rows[2].saved).to.equal("Client’s builder list");
      expect(comparison.builders[0].source).to.equal("Client default");
    }
    const empty = builderConfigComparison({ builders: [] }, resolved);
    expect(empty.rows[2]).to.include({ saved: "0 configured", effective: "1 configured" });
    expect(empty.builders[0].source).to.equal("Client only");
    expect(empty.builders[0].rows[0].saved).to.equal("Not in saved list");
    const missing = builderConfigComparison({ builders: [{ url }] }, { builders: [] });
    expect(missing.builders[0].source).to.equal("Saved only");
    expect(missing.builders[0].rows[0].effective).to.equal("Not on client");
    const unavailable = builderConfigComparison({ builders: [{ url }] });
    expect(unavailable.rows[2].effective).to.equal("Unavailable");
    expect(unavailable.builders[0].rows[0].effective).to.equal("Unavailable");
    expect(unavailable.builders[0].source).to.equal(undefined);
  });
});

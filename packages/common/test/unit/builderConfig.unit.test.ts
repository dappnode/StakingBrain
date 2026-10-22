import { expect } from "chai";
import { defaultBuilderAuthData, validateBuilderConfig } from "../../src/builderConfig.js";

const max = "18446744073709551615";
const url = "https://builder.example.com";
const pubkey = "0x" + "ab".repeat(48);

describe("Builder configuration validation", () => {
  it("preserves omission, empty builders, explicit zero and full uint64 precision", () => {
    for (const config of [
      {},
      { builders: [] },
      { min_bid: "0", builder_boost_factor: max },
      {
        builders: [
          {
            url,
            auth_data: "0xaB",
            builder_pubkeys: [pubkey],
            max_execution_payment: max,
            min_bid: "9007199254740993",
            builder_boost_factor: "0"
          }
        ]
      }
    ]) {
      const before = JSON.stringify(config);
      validateBuilderConfig(config);
      expect(JSON.stringify(config)).to.equal(before);
    }
  });

  it("rejects imprecise numbers, malformed decimals, overflow and null fields", () => {
    for (const value of [
      0,
      9007199254740992,
      -1,
      "-1",
      "01",
      "1.0",
      "1e3",
      "",
      "18446744073709551616",
      "999999999999999999999",
      null,
      undefined
    ]) {
      expect(() => validateBuilderConfig({ min_bid: value })).to.throw();
      expect(() => validateBuilderConfig({ builder_boost_factor: value })).to.throw();
      expect(() => validateBuilderConfig({ builders: [{ url, max_execution_payment: value }] })).to.throw();
    }
  });

  it("validates URL, auth bytes, public keys, array limits and unknown fields", () => {
    for (const entry of [
      {},
      { url: "" },
      { url: "/builder" },
      { url: "file:///tmp/key" },
      { url: "https://büilder.example" },
      { url: "https://builder.example/has space" },
      { url: "https://builder.example/" + "a".repeat(2048) },
      { url, auth_data: "0x" },
      { url, auth_data: "0x1" },
      { url, auth_data: "0xgg" },
      { url, auth_data: "0x" + "ab".repeat(4097) },
      { url, builder_pubkeys: [pubkey.slice(2)] },
      { url, builder_pubkeys: ["0x" + "ab".repeat(20)] },
      { url, builder_pubkeys: Array(65).fill(pubkey) },
      { url, fee_recipient: "0x" + "11".repeat(20) }
    ])
      expect(() => validateBuilderConfig({ builders: [entry] })).to.throw();
    for (const config of [
      null,
      [],
      { builders: null },
      { builders: Array(65).fill({ url }) },
      { fee_recipient: "0x" + "11".repeat(20) }
    ])
      expect(() => validateBuilderConfig(config)).to.throw();
    validateBuilderConfig({
      builders: [{ url, auth_data: "0x" + "ab".repeat(4096), builder_pubkeys: Array(64).fill(pubkey) }]
    });
  });

  it("compares exact URLs and decoded auth bytes, including derived auth", () => {
    expect(() =>
      validateBuilderConfig({
        builders: [
          { url, auth_data: "0xaB" },
          { url, auth_data: "0xAb" }
        ]
      })
    ).to.throw("duplicates");
    expect(() =>
      validateBuilderConfig({ builders: [{ url }, { url, auth_data: defaultBuilderAuthData(url) }] })
    ).to.throw("duplicates");
    validateBuilderConfig({
      builders: [
        { url, auth_data: "0x01" },
        { url, auth_data: "0x02" },
        { url: url + "/", auth_data: "0x01" }
      ]
    });
  });

  it("derives the specified ASCII hostname identities including compressed IPv6", () => {
    const cases = [
      ["HTTPS://Builder.Example.com:443/bids?x=1", "builder.example.com"],
      ["https://user:pw@builder.example.com/", "builder.example.com"],
      ["https://10.0.0.5:18550/eth/v1/builder", "10.0.0.5"],
      ["https://127.1:18550/", "127.1"],
      ["https://[0:0:0:0:0:0:0:1]:8443/", "[::1]"],
      ["https://[::ffff:192.0.2.1]/", "[::ffff:c000:201]"]
    ];
    for (const [input, expected] of cases)
      expect(defaultBuilderAuthData(input)).to.equal("0x" + Buffer.from(expected).toString("hex"));
  });
});

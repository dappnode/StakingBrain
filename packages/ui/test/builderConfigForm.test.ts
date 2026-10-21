import { expect } from "chai";
import { BuilderConfig, defaultBuilderAuthData } from "@stakingbrain/common";
import {
  builderConfigToForm,
  BuilderConfigForm,
  builderFormErrors,
  builderFormToConfig,
  createBuilderInput,
  splitBuilderPublicKeys
} from "../src/utils/builderConfigForm.js";

const url = "https://builder.example.com";
const maximum = "18446744073709551615";

describe("Builder settings form", () => {
  it("accepts pasted public-key lists without array syntax or numeric conversion", () => {
    const first = "0x" + "ab".repeat(48);
    const second = "0x" + "CD".repeat(48);
    const form = builderConfigToForm({ builders: [{ url }] });
    form.builders[0].publicKeys = splitBuilderPublicKeys(`  ${first},\n ${second}  `);
    expect(builderFormToConfig(form).builders?.[0].builder_pubkeys).to.deep.equal([first, second]);
  });
  it("round-trips explicit lists and per-builder options without resolving numeric defaults", () => {
    const configurations: BuilderConfig[] = [
      { builders: [] },
      { min_bid: "0", builder_boost_factor: maximum, builders: [] },
      { builders: [{ url }] },
      {
        min_bid: "9007199254740993",
        builders: [
          {
            url,
            auth_data: "0xaBcD",
            builder_pubkeys: [],
            max_execution_payment: "0",
            min_bid: maximum,
            builder_boost_factor: "0"
          },
          { url, auth_data: "0x01", builder_pubkeys: ["0x" + "ab".repeat(48)], max_execution_payment: maximum }
        ]
      }
    ];
    for (const config of configurations) {
      const form = builderConfigToForm(config);
      expect(builderFormErrors(form)).to.deep.equal({});
      expect(builderFormToConfig(form)).to.deep.equal(config);
    }
  });

  it("saves an explicit empty list for unmanaged, inherited, and reset configurations", () => {
    for (const config of [undefined, null, {}, { min_bid: "25" }]) {
      const form = builderConfigToForm(config);
      expect(form.buildersMode).to.equal("none");
      expect(builderFormToConfig(form)).to.deep.equal({ ...config, builders: [] });
    }
  });

  it("switches between explicit empty lists and custom builders without changing hidden cards", () => {
    const form = builderConfigToForm({ builders: [{ url }] });
    form.buildersMode = "none";
    expect(builderFormToConfig(form)).to.deep.equal({ builders: [] });
    form.buildersMode = "custom";
    expect(builderFormToConfig(form)).to.deep.equal({ builders: [{ url }] });
  });

  it("keeps explicit zero and full uint64 precision when a default is disabled or restored", () => {
    const form = builderConfigToForm();
    form.minBid = { enabled: true, value: "9007199254740993" };
    form.boost = { enabled: true, value: "0" };
    expect(builderFormToConfig(form)).to.deep.equal({
      min_bid: "9007199254740993",
      builder_boost_factor: "0",
      builders: []
    });
    form.minBid.enabled = false;
    expect(builderFormToConfig(form)).to.deep.equal({ builder_boost_factor: "0", builders: [] });
    form.boost = { enabled: true, value: maximum };
    expect(builderFormToConfig(form).builder_boost_factor).to.equal(maximum);
  });

  it("creates unique builder ids without crypto.randomUUID in non-secure contexts", () => {
    // DAppNode serves the UI over http://my.dappnode, where crypto.randomUUID is unavailable
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const ids = Array.from({ length: 100 }, () => createBuilderInput().id);
      expect(new Set(ids).size).to.equal(ids.length);
      expect(builderFormErrors(builderConfigToForm())).to.deep.equal({});
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true });
    }
  });

  it("retains omitted authorization and public keys until the user explicitly configures them", () => {
    const form = builderConfigToForm({ builders: [{ url }] });
    const entry = form.builders[0];
    expect(builderFormToConfig(form).builders?.[0]).not.to.have.property("auth_data");
    expect(builderFormToConfig(form).builders?.[0]).not.to.have.property("builder_pubkeys");
    entry.authData = { enabled: true, value: "0xab" };
    entry.publicKeys = [];
    expect(builderFormToConfig(form).builders?.[0]).to.deep.equal({ url, auth_data: "0xab", builder_pubkeys: [] });
    entry.authData.enabled = false;
    expect(builderFormToConfig(form).builders?.[0]).not.to.have.property("auth_data");
  });

  it("associates all errors with their visible fields, including advanced public-key inputs", () => {
    const entry = createBuilderInput();
    entry.authData = { enabled: true, value: "0x1" };
    entry.maxPayment = { enabled: true, value: "18446744073709551616" };
    entry.publicKeys = ["not-a-public-key"];
    const form: BuilderConfigForm = {
      ...builderConfigToForm(),
      minBid: { enabled: true, value: "1.5" },
      boost: { enabled: true, value: "" },
      buildersMode: "custom",
      builders: [entry]
    };
    expect(Object.keys(builderFormErrors(form))).to.have.members([
      "minBid",
      "boost",
      `builders.${entry.id}.url`,
      `builders.${entry.id}.authData`,
      `builders.${entry.id}.maxPayment`,
      `builders.${entry.id}.publicKeys.0`
    ]);
    form.buildersMode = "none";
    expect(Object.keys(builderFormErrors(form))).to.have.members(["minBid", "boost"]);
  });

  it("identifies duplicate builder cards using effective authorization bytes", () => {
    const form = builderConfigToForm({ builders: [{ url }, { url, auth_data: defaultBuilderAuthData(url) }] });
    expect(builderFormErrors(form)[`builders.${form.builders[1].id}.url`]).to.include("Another builder");
    expect(() => builderFormToConfig(form)).to.throw("duplicates");
    form.builders[1].authData = { enabled: true, value: "0x01" };
    expect(builderFormErrors(form)).to.deep.equal({});
  });

  it("enforces array limits and does not modify the original saved arrays during edits", () => {
    const config: BuilderConfig = { builders: [{ url, builder_pubkeys: ["0x" + "ab".repeat(48)] }] };
    const form = builderConfigToForm(config);
    form.builders[0].publicKeys?.push("0x" + "cd".repeat(48));
    expect(config.builders?.[0].builder_pubkeys).to.have.length(1);
    form.builders = Array.from({ length: 65 }, (_, index) =>
      createBuilderInput({ url: `https://builder-${index}.example` })
    );
    expect(builderFormErrors(form).builders).to.include("64");
    expect(() => builderFormToConfig(form)).to.throw("64");
  });
});

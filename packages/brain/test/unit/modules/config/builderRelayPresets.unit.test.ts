import { expect } from "chai";
import { Network, validateBuilderConfig } from "@stakingbrain/common";
import { getBuilderRelayPresets } from "../../../../src/modules/config/builderRelayPresets.js";

describe("ePBS relay presets", () => {
  it("provides the six Hoodi ePBS endpoints as valid builder entries", () => {
    const catalog = getBuilderRelayPresets(Network.Hoodi);
    expect(catalog.network).to.equal(Network.Hoodi);
    expect(catalog.sourceUrl).to.equal("https://ethstaker.org/mev-relay-list");
    expect(catalog.relays.map(({ name }) => name)).to.deep.equal([
      "Aestus",
      "Flashbots",
      "nflaig",
      "Titan",
      "Ultra Sound",
      "pk910"
    ]);
    expect(new Set(catalog.relays.map(({ id }) => id)).size).to.equal(6);
    const config = { builders: catalog.relays.map(({ url }) => ({ url })) };
    validateBuilderConfig(config);
    for (const { url } of config.builders) {
      expect(new URL(url).protocol).to.equal("https:");
      expect(new URL(url).username).to.equal("");
    }
  });

  it("keeps future mainnet and other network catalogs separate from Hoodi", () => {
    for (const network of [Network.Mainnet, Network.Gnosis, Network.Lukso]) {
      expect(getBuilderRelayPresets(network)).to.include({ network });
      expect(getBuilderRelayPresets(network).relays).to.deep.equal([]);
    }
    const catalog = getBuilderRelayPresets(Network.Hoodi);
    catalog.relays[0].url = "https://changed.example";
    catalog.relays.pop();
    expect(getBuilderRelayPresets(Network.Hoodi).relays).to.have.length(6);
    expect(getBuilderRelayPresets(Network.Hoodi).relays[0].url).to.equal("https://hoodi.aestus.live");
  });
});

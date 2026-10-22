import { BuilderRelayPreset, BuilderRelayPresets, Network } from "@stakingbrain/common";

// ePBS endpoints from https://ethstaker.org/mev-relay-list, reviewed 2026-10-22.
// Legacy MEV-Boost URLs (with relay public keys) are not ePBS builder endpoints.
const relayPresets: Record<Network, BuilderRelayPreset[]> = {
  [Network.Hoodi]: [
    // EthStaker does not specify filtering policies for these Hoodi ePBS endpoints.
    { id: "aestus", name: "Aestus", url: "https://hoodi.aestus.live", ofacFiltering: "unknown" },
    { id: "flashbots", name: "Flashbots", url: "https://boost-relay-hoodi.flashbots.net", ofacFiltering: "unknown" },
    { id: "nflaig", name: "nflaig", url: "https://builder-hoodi.nflaig.dev", ofacFiltering: "unknown" },
    { id: "titan", name: "Titan", url: "https://hoodi.titanrelay.xyz", ofacFiltering: "unknown" },
    { id: "ultrasound", name: "Ultra Sound", url: "https://relay-hoodi.ultrasound.money", ofacFiltering: "unknown" },
    { id: "pk910", name: "pk910", url: "https://builder-hoodi.pk910.de", ofacFiltering: "unknown" }
  ],
  // Add mainnet ePBS endpoints here when announced; never fall back to testnet relays.
  [Network.Mainnet]: [],
  [Network.Gnosis]: [],
  [Network.Lukso]: []
};

export function getBuilderRelayPresets(network: Network): BuilderRelayPresets {
  return {
    network,
    sourceUrl: "https://ethstaker.org/mev-relay-list",
    relays: relayPresets[network].map((relay) => ({ ...relay }))
  };
}

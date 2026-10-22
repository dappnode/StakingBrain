import { Network } from "./types/index.js";

export interface BuilderRelayPreset {
  id: string;
  name: string;
  url: string;
  /** Filtering for this network and endpoint, not the operator's other relays. */
  ofacFiltering: "yes" | "no" | "unknown";
}

export interface BuilderRelayPresets {
  network: Network;
  sourceUrl: string;
  relays: BuilderRelayPreset[];
}

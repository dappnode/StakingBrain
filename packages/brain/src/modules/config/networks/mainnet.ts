import type { NetworkConfig } from "../types.js";

export const mainnetBrainConfig = (): NetworkConfig => {
  return {
    blockExplorerUrl: "https://beaconcha.in",
    minGenesisTime: 1606824000,
    secondsPerSlot: 12,
    slotsPerEpoch: 32
  };
};

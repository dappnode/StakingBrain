import type { NetworkConfig } from "../types.js";

export const praterBrainConfig = (): NetworkConfig => {
  return {
    blockExplorerUrl: "https://prater.beaconcha.in",
    minGenesisTime: 1614588812, // Mar-01-2021 08:53:32 AM +UTC
    secondsPerSlot: 12,
    slotsPerEpoch: 32
  };
};

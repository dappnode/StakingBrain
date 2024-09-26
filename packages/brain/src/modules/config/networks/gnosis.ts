import type { NetworkConfig } from "../types.js";

export const gnosisBrainConfig = (): NetworkConfig => {
  return {
    blockExplorerUrl: "https://gnosischa.in",
    minGenesisTime: 1638968400, // Dec 8, 2021, 13:00 UTC
    secondsPerSlot: 5,
    slotsPerEpoch: 16
  };
};

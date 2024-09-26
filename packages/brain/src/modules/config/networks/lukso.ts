import type { NetworkConfig } from "../types.js";

export const luksoBrainConfig = (): NetworkConfig => {
  return {
    blockExplorerUrl: "https://explorer.consensus.mainnet.lukso.network/",
    minGenesisTime: 1684856400, // Tuesday, 23 May 2023 15:40:00 GMT
    secondsPerSlot: 12,
    slotsPerEpoch: 32
  };
};

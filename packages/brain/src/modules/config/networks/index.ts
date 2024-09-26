import { gnosisBrainConfig } from "./gnosis.js";
import { holeskyBrainConfig } from "./holesky.js";
import { luksoBrainConfig } from "./lukso.js";
import { mainnetBrainConfig } from "./mainnet.js";
import { praterBrainConfig } from "./prater.js";
import type { NetworkConfig } from "../types.js";
import { Network } from "@stakingbrain/common";

export const networkConfig = (network: Network): NetworkConfig => {
  switch (network) {
    case Network.Holesky:
      return holeskyBrainConfig();
    case Network.Mainnet:
      return mainnetBrainConfig();
    case Network.Gnosis:
      return gnosisBrainConfig();
    case Network.Lukso:
      return luksoBrainConfig();
    case Network.Prater:
      return praterBrainConfig();
    default:
      throw Error(`Network ${network} is not supported`);
  }
};

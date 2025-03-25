import { gnosisBrainConfig } from "./gnosis.js";
import { holeskyBrainConfig } from "./holesky.js";
import { hoodiBrainConfig } from "./hoodi.js";
import { luksoBrainConfig } from "./lukso.js";
import { mainnetBrainConfig } from "./mainnet.js";
import { praterBrainConfig } from "./prater.js";
import { Network } from "@stakingbrain/common";

export const networkConfig = (network: Network) => {
  switch (network) {
    case Network.Hoodi:
      return hoodiBrainConfig();
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

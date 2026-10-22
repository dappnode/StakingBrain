import { gnosisBrainConfig } from "./gnosis.js";
import { hoodiBrainConfig } from "./hoodi.js";
import { luksoBrainConfig } from "./lukso.js";
import { mainnetBrainConfig } from "./mainnet.js";
import { Network } from "@stakingbrain/common";

export const networkConfig = (network: Network) => {
  switch (network) {
    case Network.Hoodi:
      return hoodiBrainConfig();
    case Network.Mainnet:
      return mainnetBrainConfig();
    case Network.Gnosis:
      return gnosisBrainConfig();
    case Network.Lukso:
      return luksoBrainConfig();
    default:
      throw Error(`Network ${network} is not supported`);
  }
};

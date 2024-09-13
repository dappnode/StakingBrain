import { Network } from "@stakingbrain/common";
import { loadEnvs } from "./loadEnvs.js";
import { BrainConfig } from "./types.js";
import {
  gnosisBrainConfig,
  holeskyBrainConfig,
  luksoBrainConfig,
  mainnetBrainConfig,
  praterBrainConfig
} from "./networks/index.js";

export const brainConfig = (): BrainConfig => {
  const { network, executionClientSelected, consensusClientSelected, isMevBoostSet, shareDataWithDappnode } =
    loadEnvs();
  switch (network) {
    case Network.Holesky:
      return holeskyBrainConfig(executionClientSelected, consensusClientSelected, isMevBoostSet, shareDataWithDappnode);
    case Network.Mainnet:
      return mainnetBrainConfig(executionClientSelected, consensusClientSelected, isMevBoostSet, shareDataWithDappnode);
    case Network.Gnosis:
      return gnosisBrainConfig(executionClientSelected, consensusClientSelected, isMevBoostSet, shareDataWithDappnode);
    case Network.Lukso:
      return luksoBrainConfig(executionClientSelected, consensusClientSelected, isMevBoostSet, shareDataWithDappnode);
    case Network.Prater:
      return praterBrainConfig(executionClientSelected, consensusClientSelected, isMevBoostSet, shareDataWithDappnode);
    default:
      throw Error(`Network ${network} is not supported`);
  }
};

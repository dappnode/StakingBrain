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
  const { network, executionClient, consensusClient, isMevBoostSet, shareDataWithDappnode } = loadEnvs();
  switch (network) {
    case Network.Holesky:
      return holeskyBrainConfig(executionClient, consensusClient, isMevBoostSet, shareDataWithDappnode);
    case Network.Mainnet:
      return mainnetBrainConfig(executionClient, consensusClient, isMevBoostSet, shareDataWithDappnode);
    case Network.Gnosis:
      return gnosisBrainConfig(executionClient, consensusClient, isMevBoostSet, shareDataWithDappnode);
    case Network.Lukso:
      return luksoBrainConfig(executionClient, consensusClient, isMevBoostSet, shareDataWithDappnode);
    case Network.Prater:
      return praterBrainConfig(executionClient, consensusClient, isMevBoostSet, shareDataWithDappnode);
    default:
      throw Error(`Network ${network} is not supported`);
  }
};

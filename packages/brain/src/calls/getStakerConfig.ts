import { Network, StakerConfig } from "@stakingbrain/common";
import {
  network,
  executionClient,
  consensusClient,
  isMevBoostSet,
  executionClientUrl,
  validatorUrl,
  beaconchainUrl,
  signerUrl,
} from "../index.js";

export async function getStakerConfig(): Promise<StakerConfig<Network>> {
  return {
    network,
    executionClient,
    consensusClient,
    isMevBoostSet,
    executionClientUrl,
    validatorUrl,
    beaconchainUrl,
    signerUrl,
  };
}

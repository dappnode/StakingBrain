import { StakerConfig } from "@stakingbrain/common";
import {
  network,
  executionClient,
  consensusClient,
  isMevBoostSet,
  executionClientUrl,
  validatorUrl,
  beaconchainUrl,
  signerUrl
} from "../index.js";

export async function getStakerConfig(): Promise<StakerConfig> {
  return {
    network,
    executionClient,
    consensusClient,
    isMevBoostSet,
    executionClientUrl,
    validatorUrl,
    beaconchainUrl,
    signerUrl
  };
}

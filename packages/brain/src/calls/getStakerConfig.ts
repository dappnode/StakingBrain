import { StakerConfig } from "@stakingbrain/common";
import {
  network,
  executionClientSelected,
  consensusClientSelected,
  isMevBoostSet,
  executionClientUrl,
  validatorUrl,
  beaconchainUrl,
  signerUrl
} from "../index.js";

export async function getStakerConfig(): Promise<StakerConfig> {
  return {
    network,
    executionClientSelected,
    consensusClientSelected,
    isMevBoostSet,
    executionClientUrl,
    validatorUrl,
    beaconchainUrl,
    signerUrl
  };
}

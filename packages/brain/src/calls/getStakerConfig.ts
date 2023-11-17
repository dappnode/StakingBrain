import { Network, StakerConfig } from "@stakingbrain/common";
import {
  network,
  executionClient,
  consensusClient,
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
    executionClientUrl,
    validatorUrl,
    beaconchainUrl,
    signerUrl,
  };
}

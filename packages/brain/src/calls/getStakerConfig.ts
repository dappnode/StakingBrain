import { Network, StakerConfig } from "@stakingbrain/common";
import { network, executionClient, consensusClient } from "../index.js";

export async function getStakerConfig(): Promise<StakerConfig<Network>> {
  return {
    network,
    executionClient,
    consensusClient,
  };
}

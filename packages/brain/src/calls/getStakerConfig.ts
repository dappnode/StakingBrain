import { StakerConfig } from "@stakingbrain/common";

export async function getStakerConfig(): Promise<StakerConfig> {
  return {
    network: "mainnet",
    executionClient: "geth",
    consensusClient: "lighthouse",
  };
}

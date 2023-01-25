export type Network = "mainnet" | "gnosis" | "prater";

export interface StakerConfig {
  network: Network;
  executionClient: string;
  consensusClient: string;
}

import { ConsensusClient, ExecutionClient, Network } from "@stakingbrain/common";

export interface BrainConfig extends NetworkConfig {
  network: Network;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  isMevBoostSet: boolean;
  executionClientUrl: string;
  validatorUrl: string;
  beaconchainUrl: string;
  signerUrl: string;
  token: string;
  host: string;
  shareDataWithDappnode: boolean;
  validatorsMonitorUrl: string;
  shareCronInterval: number;
  postgresUrl: string;
  tlsCert: Buffer | null;
}

export interface NetworkConfig {
  minGenesisTime: number;
  secondsPerSlot: number;
  slotsPerEpoch: number;
  blockExplorerUrl: string;
}

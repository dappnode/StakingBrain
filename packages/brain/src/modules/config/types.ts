import { ConsensusClient, ExecutionClient, Network } from "@stakingbrain/common";

export interface BrainConfig {
  chain: ChainConfig;
  apis: ApisConfig;
}

export interface ApisConfig {
  prometheusUrl: string;
  signerUrl: string;
  blockExplorerUrl: string;
  validatorUrl: string;
  beaconchainUrl: string;
  executionClientUrl: string;
  dappmanagerUrl: string;
  postgresUrl: string;
  token: string;
  tlsCert: Buffer | null;
  host: string;
  cors: string[] | null;
}

export interface ChainConfig {
  minGenesisTime: number;
  secondsPerSlot: number;
  slotsPerEpoch: number;
  network: Network;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  isMevBoostSet: boolean;
}

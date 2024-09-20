import { ConsensusClient, ExecutionClient, Network } from "@stakingbrain/common";

export interface BrainConfig {
  network: Network;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  isMevBoostSet: boolean;
  executionClientUrl: string;
  validatorUrl: string;
  beaconchainUrl: string;
  blockExplorerUrl: string;
  signerUrl: string;
  token: string;
  host: string;
  shareDataWithDappnode: boolean;
  validatorsMonitorUrl: string;
  shareCronInterval: number;
  minGenesisTime: number;
  postgresUrl: string;
  secondsPerSlot: number;
  slotsPerEpoch: number;
  tlsCert: Buffer | null;
}

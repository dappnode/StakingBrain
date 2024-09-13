import { Network } from "@stakingbrain/common";

export interface BrainConfig {
  network: Network;
  executionClientSelected: string;
  consensusClientSelected: string;
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
  tlsCert: Buffer | null;
}

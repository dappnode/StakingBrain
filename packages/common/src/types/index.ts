export enum Network {
  Mainnet = "mainnet",
  Gnosis = "gnosis",
  Prater = "prater",
  Lukso = "lukso",
  Holesky = "holesky"
}

export enum ExecutionClient {
  Besu = "besu",
  Nethermind = "nethermind",
  Geth = "geth",
  Reth = "reth",
  Erigon = "erigon",
  Unknown = "unknown"
}

export enum ConsensusClient {
  Teku = "teku",
  Prysm = "prysm",
  Lighthouse = "lighthouse",
  Nimbus = "nimbus",
  Lodestar = "lodestar",
  Unknown = "unknown"
}

export interface StakerConfig {
  network: Network;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  isMevBoostSet: boolean;
  executionClientUrl: string;
  validatorUrl: string;
  beaconchainUrl: string;
  signerUrl: string;
}

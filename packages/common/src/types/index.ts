export enum Network {
  Mainnet = "mainnet",
  Gnosis = "gnosis",
  Prater = "prater",
  Lukso = "lukso",
  Holesky = "holesky"
}

export interface StakerConfig {
  network: Network;
  executionClientSelected: string;
  consensusClientSelected: string;
  isMevBoostSet: boolean;
  executionClientUrl: string;
  validatorUrl: string;
  beaconchainUrl: string;
  signerUrl: string;
}

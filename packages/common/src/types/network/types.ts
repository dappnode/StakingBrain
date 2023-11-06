export const networks = ["mainnet", "gnosis", "prater", "lukso", "holesky"] as const;

export type Network = (typeof networks)[number];

export interface StakerConfig<T extends Network> {
  network: T;
  executionClient: ExecutionClient<T>;
  consensusClient: ConsensusClient<T>;
  executionClientUrl: string;
  validatorUrl: string;
  beaconchainUrl: string;
  signerUrl: string;
  defaultFeeRecipient?: string;
}

export type ExecutionClient<T extends Network> = T extends "mainnet"
  ? ExecutionClientMainnet
  : T extends "gnosis"
  ? ExecutionClientGnosis
  : T extends "prater"
  ? ExecutionClientPrater
  : T extends "lukso"
  ? ExecutionClientLukso
  : T extends "holesky"
  ? ExecutionClientHolesky
  : never;

export type ConsensusClient<T extends Network> = T extends "mainnet"
  ? ConsensusClientMainnet
  : T extends "gnosis"
  ? ConsensusClientGnosis
  : T extends "prater"
  ? ConsensusClientPrater
  : T extends "lukso"
  ? ConsensusClientLukso
  : T extends "holesky"
  ? ConsensusClientHolesky
  : never;

export type Signer<T extends Network> = T extends "mainnet"
  ? SignerMainnet
  : T extends "gnosis"
  ? SignerGnosis
  : T extends "prater"
  ? SignerPrater
  : T extends "lukso"
  ? SignerLukso
  : T extends "holesky"
  ? SignerHolesky
  : never;

// Mainnet

export const signerMainnet = "web3signer.dnp.dappnode.eth";
export type SignerMainnet = typeof signerMainnet;

export const executionClientsMainnet = [
  "geth.dnp.dappnode.eth",
  "besu.public.dappnode.eth",
  "erigon.dnp.dappnode.eth",
  "nethermind.public.dappnode.eth",
] as const;
export type ExecutionClientMainnet = (typeof executionClientsMainnet)[number];

export const consensusClientsMainnet = [
  "prysm.dnp.dappnode.eth",
  "lighthouse.dnp.dappnode.eth",
  "teku.dnp.dappnode.eth",
  "nimbus.dnp.dappnode.eth",
  "lodestar.dnp.dappnode.eth",
] as const;
export type ConsensusClientMainnet = (typeof consensusClientsMainnet)[number];

// Prater

export const signerPrater = "web3signer-prater.dnp.dappnode.eth";
export type SignerPrater = typeof signerPrater;

export const consensusClientsPrater = [
  "prysm-prater.dnp.dappnode.eth",
  "lighthouse-prater.dnp.dappnode.eth",
  "teku-prater.dnp.dappnode.eth",
  "nimbus-prater.dnp.dappnode.eth",
  "lodestar-prater.dnp.dappnode.eth",
] as const;
export type ConsensusClientPrater = (typeof consensusClientsPrater)[number];

export const executionClientsPrater = [
  "goerli-geth.dnp.dappnode.eth",
  "goerli-erigon.dnp.dappnode.eth",
  "goerli-nethermind.dnp.dappnode.eth",
  "goerli-besu.dnp.dappnode.eth",
] as const;
export type ExecutionClientPrater = (typeof executionClientsPrater)[number];

// Gnosis

export const signerGnosis = "web3signer-gnosis.dnp.dappnode.eth";
export type SignerGnosis = typeof signerGnosis;

export const executionClientsGnosis = [
  "nethermind-xdai.dnp.dappnode.eth",
] as const;
export type ExecutionClientGnosis = (typeof executionClientsGnosis)[number];

export const consensusClientsGnosis = [
  "gnosis-beacon-chain-prysm.dnp.dappnode.eth",
  "lighthouse-gnosis.dnp.dappnode.eth",
  "teku-gnosis.dnp.dappnode.eth",
  "nimbus-gnosis.dnp.dappnode.eth",
  "lodestar-gnosis.dnp.dappnode.eth",
] as const;
export type ConsensusClientGnosis = (typeof consensusClientsGnosis)[number];

// Lukso

export const signerLukso = "web3signer-lukso.dnp.dappnode.eth";
export type SignerLukso = typeof signerLukso;

export const consensusClientsLukso = [
  "prysm-lukso.dnp.dappnode.eth",
  "lighthouse-lukso.dnp.dappnode.eth",
  "teku-lukso.dnp.dappnode.eth",
  "nimbus-lukso.dnp.dappnode.eth",
  "lodestar-lukso.dnp.dappnode.eth",
] as const;
export type ConsensusClientLukso = (typeof consensusClientsLukso)[number];

export const executionClientsLukso = [
  "lukso-geth.dnp.dappnode.eth",
  "lukso-erigon.dnp.dappnode.eth",
  "lukso-nethermind.dnp.dappnode.eth",
  "lukso-besu.dnp.dappnode.eth",
] as const;
export type ExecutionClientLukso = (typeof executionClientsLukso)[number];

// Holesky 

export const signerHolesky = "web3signer-holesky.dnp.dappnode.eth";
export type SignerHolesky = typeof signerHolesky;

export const consensusClientsHolesky = [
  "prysm-holesky.dnp.dappnode.eth",
  "lighthouse-holesky.dnp.dappnode.eth",
  "teku-holesky.dnp.dappnode.eth",
  "nimbus-holesky.dnp.dappnode.eth",
  "lodestar-holesky.dnp.dappnode.eth",
] as const;
export type ConsensusClientHolesky = (typeof consensusClientsHolesky)[number];

export const executionClientsHolesky = [
  "holesky-geth.dnp.dappnode.eth",
  "holesky-erigon.dnp.dappnode.eth",
  "holesky-nethermind.dnp.dappnode.eth",
  "holesky-besu.dnp.dappnode.eth",
] as const;
export type ExecutionClientHolesky = (typeof executionClientsHolesky)[number];
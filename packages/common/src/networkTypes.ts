export const networks = ["mainnet", "gnosis", "prater"] as const;

export type Network = typeof networks[number];

export interface StakerConfig<T extends Network> {
  network: T;
  executionClient: ExecutionClient<T>;
  consensusClient: ConsensusClient<T>;
}

export type ExecutionClient<T extends Network> = T extends "mainnet"
  ? ExecutionClientMainnet
  : T extends "gnosis"
  ? ExecutionClientGnosis
  : T extends "prater"
  ? ExecutionClientPrater
  : never;

export type ConsensusClient<T extends Network> = T extends "mainnet"
  ? ConsensusClientMainnet
  : T extends "gnosis"
  ? ConsensusClientGnosis
  : T extends "prater"
  ? ConsensusClientPrater
  : never;

export type Signer<T extends Network> = T extends "mainnet"
  ? SignerMainnet
  : T extends "gnosis"
  ? SignerGnosis
  : T extends "prater"
  ? SignerPrater
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
export type ExecutionClientMainnet = typeof executionClientsMainnet[number];

export const consensusClientsMainnet = [
  "prysm.dnp.dappnode.eth",
  "lighthouse.dnp.dappnode.eth",
  "teku.dnp.dappnode.eth",
  "nimbus.dnp.dappnode.eth",
  "lodestar.dnp.dappnode.eth",
] as const;
export type ConsensusClientMainnet = typeof consensusClientsMainnet[number];

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
export type ConsensusClientPrater = typeof consensusClientsPrater[number];

export const executionClientsPrater = [
  "goerli-geth.dnp.dappnode.eth",
  "goerli-erigon.dnp.dappnode.eth",
  "goerli-nethermind.dnp.dappnode.eth",
  "goerli-besu.dnp.dappnode.eth",
] as const;
export type ExecutionClientPrater = typeof executionClientsPrater[number];

// Gnosis

export const signerGnosis = "web3signer-gnosis.dnp.dappnode.eth";
export type SignerGnosis = typeof signerGnosis;

export const executionClientsGnosis = [
  "nethermind-xdai.dnp.dappnode.eth",
] as const;
export type ExecutionClientGnosis = typeof executionClientsGnosis[number];

export const consensusClientsGnosis = [
  "gnosis-beacon-chain-prysm.dnp.dappnode.eth",
  "lighthouse-gnosis.dnp.dappnode.eth",
  "teku-gnosis.dnp.dappnode.eth",
  "nimbus-gnosis.dnp.dappnode.eth",
  "lodestar-gnosis.dnp.dappnode.eth",
] as const;
export type ConsensusClientGnosis = typeof consensusClientsGnosis[number];

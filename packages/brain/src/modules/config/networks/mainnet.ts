import { ConsensusClient, ExecutionClient, Network } from "@stakingbrain/common";
import { BrainConfig } from "../types.js";
import { tlsCert } from "./tlsCert.js";
import { validatorToken } from "./validatorToken.js";

export const mainnetBrainConfig = (
  executionClient: ExecutionClient,
  consensusClient: ConsensusClient,
  isMevBoostSet: boolean,
  shareDataWithDappnode: boolean
): BrainConfig => {
  return {
    network: Network.Mainnet,
    executionClient,
    consensusClient,
    isMevBoostSet,
    executionClientUrl: "http://execution.mainnet.dncore.dappnode:8545",
    validatorUrl: `${consensusClient === "teku" ? "https" : "http"}://validator.mainnet.dncore.dappnode:3500`,
    beaconchainUrl: "http:/beacon-chain.mainnet.dncore.dappnode:3500",
    blockExplorerUrl: "https://beaconcha.in",
    signerUrl: "http://web3signer.web3signer.dappnode:9000",
    token: validatorToken(consensusClient),
    host: "brain.web3signer.dappnode",
    shareDataWithDappnode,
    validatorsMonitorUrl: "https://validators-proofs.dappnode.io",
    shareCronInterval: 24 * 60 * 60 * 1000, // 1 day in ms
    minGenesisTime: 1606824000,
    postgresUrl: "postgres://postgres:mainnet@postgres.web3signer.dappnode:5432/web3signer-mainnet",
    secondsPerSlot: 12,
    slotsPerEpoch: 32,
    tlsCert: tlsCert(consensusClient)
  };
};

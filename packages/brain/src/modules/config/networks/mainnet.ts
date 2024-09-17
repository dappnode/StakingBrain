import { Network } from "@stakingbrain/common";
import { BrainConfig } from "../types.js";
import { tlsCert } from "./tlsCert.js";
import { validatorToken } from "./validatorToken.js";

export const mainnetBrainConfig = (
  executionClientSelected: string,
  consensusClientSelected: string,
  isMevBoostSet: boolean,
  shareDataWithDappnode: boolean
): BrainConfig => {
  return {
    network: Network.Mainnet,
    executionClientSelected,
    consensusClientSelected,
    isMevBoostSet,
    executionClientUrl: "http://execution.mainnet.dncore.dappnode:8545",
    validatorUrl: "http://validator.mainnet.dncore.dappnode:3500",
    beaconchainUrl: "http:/beacon-chain.mainnet.dncore.dappnode:3500",
    blockExplorerUrl: "https://beaconcha.in",
    signerUrl: "http://web3signer.web3signer.dappnode:9000",
    token: validatorToken(consensusClientSelected),
    host: "brain.web3signer.dappnode",
    shareDataWithDappnode,
    validatorsMonitorUrl: "https://validators-proofs.dappnode.io",
    shareCronInterval: 24 * 60 * 60 * 1000, // 1 day in ms
    minGenesisTime: 1606824000,
    postgresUrl: "postgres://postgres:mainnet@postgres.web3signer.dappnode:5432/web3signer-mainnet",
    secondsPerSlot: 12,
    tlsCert: tlsCert(consensusClientSelected)
  };
};

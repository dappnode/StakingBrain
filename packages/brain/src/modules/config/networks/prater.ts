import { Network } from "@stakingbrain/common";
import { BrainConfig } from "../types.js";
import { tlsCert } from "./tlsCert.js";
import { validatorToken } from "./validatorToken.js";

export const praterBrainConfig = (
  executionClientSelected: string,
  consensusClientSelected: string,
  isMevBoostSet: boolean,
  shareDataWithDappnode: boolean
): BrainConfig => {
  return {
    network: Network.Prater,
    executionClientSelected,
    consensusClientSelected,
    isMevBoostSet,
    executionClientUrl: "http://execution.prater.dncore.dappnode:8545",
    validatorUrl: "http://validator.prater.dncore.dappnode:3500",
    beaconchainUrl: "http:/beacon-chain.prater.dncore.dappnode:3500",
    blockExplorerUrl: "https://prater.beaconcha.in",
    signerUrl: "http://web3signer.web3signer-prater.dappnode:9000",
    token: validatorToken(consensusClientSelected),
    host: "brain.web3signer-prater.dappnode",
    shareDataWithDappnode,
    validatorsMonitorUrl: "https://validators-proofs.dappnode.io",
    shareCronInterval: 24 * 60 * 60 * 1000, // 1 day in ms
    minGenesisTime: 1614588812, // Mar-01-2021 08:53:32 AM +UTC
    postgresUrl: "postgres://postgres:password@postgres.web3signer-prater.dappnode:5432/web3signer",
    secondsPerSlot: 12,
    tlsCert: tlsCert(consensusClientSelected)
  };
};

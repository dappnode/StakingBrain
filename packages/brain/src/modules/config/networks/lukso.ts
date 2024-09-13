import { Network } from "@stakingbrain/common";
import { BrainConfig } from "../types.js";
import { tlsCert } from "./tlsCert.js";
import { validatorToken } from "./validatorToken.js";

export const luksoBrainConfig = (
  executionClientSelected: string,
  consensusClientSelected: string,
  isMevBoostSet: boolean,
  shareDataWithDappnode: boolean
): BrainConfig => {
  return {
    network: Network.Lukso,
    executionClientSelected,
    consensusClientSelected,
    isMevBoostSet,
    executionClientUrl: "http://execution.lukso.dncore.dappnode:8545",
    validatorUrl: "http://validator.lukso.dncore.dappnode:3500",
    beaconchainUrl: "http:/beacon-chain.lukso.dncore.dappnode:3500",
    blockExplorerUrl: "https://explorer.consensus.mainnet.lukso.network/",
    signerUrl: "http://web3signer.web3signer-lukso.dappnode:9000",
    token: validatorToken(consensusClientSelected),
    host: "brain.web3signer-lukso.dappnode",
    shareDataWithDappnode,
    validatorsMonitorUrl: "https://validators-proofs.dappnode.io",
    shareCronInterval: 24 * 60 * 60 * 1000, // 1 day in ms
    minGenesisTime: 1684856400, // Tuesday, 23 May 2023 15:40:00 GMT
    postgresUrl: "postgres://postgres:password@postgres.web3signer-lukso.dappnode:5432/web3signer",
    tlsCert: tlsCert(consensusClientSelected)
  };
};

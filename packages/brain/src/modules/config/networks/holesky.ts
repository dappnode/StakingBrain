import { Network } from "@stakingbrain/common";
import { BrainConfig } from "../types.js";
import { tlsCert } from "./tlsCert.js";
import { validatorToken } from "./validatorToken.js";

export const holeskyBrainConfig = (
  executionClientSelected: string,
  consensusClientSelected: string,
  isMevBoostSet: boolean,
  shareDataWithDappnode: boolean
): BrainConfig => {
  return {
    network: Network.Holesky,
    executionClientSelected,
    consensusClientSelected,
    isMevBoostSet,
    executionClientUrl: "http://execution.holesky.dncore.dappnode:8545",
    validatorUrl: "http://validator.holesky.dncore.dappnode:3500",
    beaconchainUrl: "http:/beacon-chain.holesky.dncore.dappnode:3500",
    blockExplorerUrl: "https://holesky.beaconcha.in",
    signerUrl: "http://web3signer.web3signer-holesky.dappnode:9000",
    token: validatorToken(consensusClientSelected),
    host: "brain.web3signer-holesky.dappnode",
    shareDataWithDappnode,
    validatorsMonitorUrl: "https://validators-proofs.dappnode.io",
    shareCronInterval: 24 * 60 * 60 * 1000, // 1 day in ms
    minGenesisTime: 1695902100, // Sep-28-2023 11:55:00 +UTC
    postgresUrl: "postgres://postgres:password@postgres.web3signer-holesky.dappnode:5432/web3signer",
    secondsPerSlot: 12,
    slotsPerEpoch: 32,
    tlsCert: tlsCert(consensusClientSelected)
  };
};

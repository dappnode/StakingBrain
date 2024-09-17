import { Network } from "@stakingbrain/common";
import { BrainConfig } from "../types.js";
import { tlsCert } from "./tlsCert.js";
import { validatorToken } from "./validatorToken.js";

export const gnosisBrainConfig = (
  executionClientSelected: string,
  consensusClientSelected: string,
  isMevBoostSet: boolean,
  shareDataWithDappnode: boolean
): BrainConfig => {
  return {
    network: Network.Gnosis,
    executionClientSelected,
    consensusClientSelected,
    isMevBoostSet,
    executionClientUrl: "http://execution.gnosis.dncore.dappnode:8545",
    validatorUrl: "http://validator.gnosis.dncore.dappnode:3500",
    beaconchainUrl: "http:/beacon-chain.gnosis.dncore.dappnode:3500",
    blockExplorerUrl: "https://gnosischa.in",
    signerUrl: "http://web3signer.web3signer-gnosis.dappnode:9000",
    token: validatorToken(consensusClientSelected),
    host: "brain.web3signer-gnosis.dappnode",
    shareDataWithDappnode,
    validatorsMonitorUrl: "https://validators-proofs.dappnode.io",
    shareCronInterval: 24 * 60 * 60 * 1000, // 1 day in ms
    minGenesisTime: 1638968400, // Dec 8, 2021, 13:00 UTC
    postgresUrl: "postgres://postgres:gnosis@postgres.web3signer-gnosis.dappnode:5432/web3signer-gnosis",
    secondsPerSlot: 5,
    slotsPerEpoch: 16,
    tlsCert: tlsCert(consensusClientSelected)
  };
};

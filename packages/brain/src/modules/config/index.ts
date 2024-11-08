import { Network } from "@stakingbrain/common";
import { loadEnvs } from "./loadEnvs.js";
import { BrainConfig } from "./types.js";
import { networkConfig } from "./networks/index.js";
import { getValidatorToken } from "./getValidatorToken.js";
import { getTlsCert } from "./getTlsCert.js";

export const brainConfig = (): BrainConfig => {
  const { network, executionClient, consensusClient, isMevBoostSet, cors } = loadEnvs();

  // Determine the validator URL based on the consensus client and network.
  // All this logic is needed because Teku has a TLS certificate that points to the old
  // https://validator.teku-${network}.dappnode:3500 URL. TODO: update the Teku TLS certificate https://docs.teku.consensys.io/how-to/configure/tls
  let validatorUrl;
  if (consensusClient === "teku") {
    validatorUrl =
      network === Network.Mainnet
        ? `https://validator.teku.dappnode:3500`
        : `https://validator.teku-${network}.dappnode:3500`;
  } else {
    validatorUrl = `http://validator.${network}.dncore.dappnode:3500`;
  }

  const { blockExplorerUrl, minGenesisTime, secondsPerSlot, slotsPerEpoch } = networkConfig(network);

  return {
    chain: {
      network,
      executionClient,
      consensusClient,
      isMevBoostSet,
      minGenesisTime,
      secondsPerSlot,
      slotsPerEpoch
    },
    apis: {
      prometheusUrl: "http://prometheus.dms.dappnode:9090",
      dappmanagerUrl: "http://my.dappnode:9000",
      blockExplorerUrl,
      executionClientUrl: `http://execution.${network}.dncore.dappnode:8545`,
      validatorUrl,
      beaconchainUrl: `http:/beacon-chain.${network}.dncore.dappnode:3500`,
      signerUrl: `http://signer.${network}.dncore.dappnode:9000`,
      postgresUrl: getPostgresUrl(network),
      token: getValidatorToken(consensusClient),
      host: network === "mainnet" ? `brain.web3signer.dappnode` : `brain.web3signer-${network}.dappnode`,
      tlsCert: getTlsCert(consensusClient, network), // To avoid Teku edge case it is necessary to update TLS certificate in both: validator and brain
      cors
    }
  };
};

const getPostgresUrl = (network: Network): string => {
  switch (network) {
    case Network.Holesky:
      return "postgres://postgres:password@postgres.web3signer-holesky.dappnode:5432/web3signer";
    case Network.Mainnet:
      return "postgres://postgres:mainnet@postgres.web3signer.dappnode:5432/web3signer-mainnet";
    case Network.Gnosis:
      return "postgres://postgres:gnosis@postgres.web3signer-gnosis.dappnode:5432/web3signer-gnosis";
    case Network.Lukso:
      return "postgres://postgres:password@postgres.web3signer-lukso.dappnode:5432/web3signer";
    case Network.Prater:
      return "postgres://postgres:password@postgres.web3signer-prater.dappnode:5432/web3signer";
  }
};

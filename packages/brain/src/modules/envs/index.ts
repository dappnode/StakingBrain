import {
  Network,
  networks,
  executionClientsMainnet,
  executionClientsPrater,
  executionClientsGnosis,
  executionClientsLukso,
  ExecutionClientMainnet,
  consensusClientsMainnet,
  ConsensusClientMainnet,
  ExecutionClientGnosis,
  ExecutionClientLukso,
  ExecutionClientPrater,
  consensusClientsGnosis,
  consensusClientsLukso,
  consensusClientsPrater,
  ConsensusClientPrater,
  ConsensusClientGnosis,
  ConsensusClientLukso,
  ExecutionClient,
  ConsensusClient,
} from "@stakingbrain/common";
import path from "path";
import fs from "fs";
import { params } from "../../params.js";
import { __dirname } from "../../index.js";
import { isValidEcdsaPubkey } from "@stakingbrain/common";

/**
 * Loads the staker config needed to create the base urls for beacon, validator and signer APIs
 *
 * @throws NETWORK environment variable is not set
 * This exception is thrown if the NETWORK environment variable is not set
 *
 * @throws NETWORK environment variable is not valid
 * This exception is thrown if the NETWORK environment variable is different from mainnet, prater or gnosis
 *
 * @throws execution client is not valid for <network>: <execution client>. Valid execution clients for <network>: <execution clients>
 * This exception is thrown if the execution client is not valid for the network
 *
 * @throws consensus client is not valid for <network>: <consensus client>. Valid consensus clients for <network>: <consensus clients>
 * This exception is thrown if the consensus client is not valid for the network
 *
 * @returns executionClientUrl, validatorUrl, beaconchainUrl, beaconchaUrl, signerUrl, token, host, defaultFeeRecipient, tlsCert
 */
export function loadStakerConfig(): {
  network: Network;
  executionClient: ExecutionClient<Network>;
  consensusClient: ConsensusClient<Network>;
  executionClientUrl: string;
  validatorUrl: string;
  beaconchainUrl: string;
  beaconchaUrl: string;
  signerUrl: string;
  token: string;
  host: string;
  defaultFeeRecipient?: string;
  tlsCert?: Buffer;
} {
  const network = process.env.NETWORK as Network;
  if (!network) throw Error("NETWORK environment variable is not set");
  if (!networks.includes(network))
    throw Error(
      `NETWORK environment variable is not valid: ${network}. Valid NETWORK values: ${networks.join(
        ", "
      )}`
    );

  const certDir = path.join(__dirname, params.certDirName);

  let executionClientUrl: string,
    validatorUrl: string,
    beaconchainUrl: string,
    token: string,
    tlsCert: Buffer | undefined;

  if (network === "mainnet") {
    const { executionClient, consensusClient, defaultFeeRecipient } =
      loadEnvs("mainnet");
    switch (executionClient) {
      case "geth.dnp.dappnode.eth":
        executionClientUrl = `http://geth.dappnode:8545`;
        break;
      case "besu.public.dappnode.eth":
        executionClientUrl = `http://besu.public.dappnode:8545`;
        break;
      case "nethermind.public.dappnode.eth":
        executionClientUrl = `http://nethermind.public.dappnode:8545`;
        break;
      case "erigon.dnp.dappnode.eth":
        executionClientUrl = `http://erigon.dappnode:8545`;
        break;
      default:
        throw Error(
          `Unknown execution client for network ${network}: ${executionClient}`
        );
    }
    switch (consensusClient) {
      case "prysm.dnp.dappnode.eth":
        token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg`;
        validatorUrl = `http://validator.prysm.dappnode:3500`;
        beaconchainUrl = `http://beacon-chain.prysm.dappnode:3500`;
        break;
      case "lighthouse.dnp.dappnode.eth":
        token = `api-token-0x0200e6ce18e26fd38caca7ae1bfb9e2bba7efb20ed2746ad17f2f6dda44603152d`;
        validatorUrl = `http://validator.lighthouse.dappnode:3500`;
        beaconchainUrl = `http://beacon-chain.lighthouse.dappnode:3500`;
        break;
      case "teku.dnp.dappnode.eth":
        token = `cd4892ca35d2f5d3e2301a65fc7aa660`;
        validatorUrl = `https://validator.teku.dappnode:3500`;
        beaconchainUrl = `http://beacon-chain.teku.dappnode:3500`;
        tlsCert = fs.readFileSync(
          path.join(certDir, "mainnet", "teku_client_keystore.p12")
        );
        break;
      case "lodestar.dnp.dappnode.eth":
        token = `api-token-0x7fd16fff6453982a5d8bf14617e7823b68cd18ade59985befe64e0a659300e7d`;
        validatorUrl = `http://validator.lodestar.dappnode:3500`;
        beaconchainUrl = `http://beacon-chain.lodestar.dappnode:3500`;
        break;
      case "nimbus.dnp.dappnode.eth":
        token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg`;
        validatorUrl = `http://beacon-validator.nimbus.dappnode:3500`;
        beaconchainUrl = `http://beacon-validator.nimbus.dappnode:4500`;
        break;
      default:
        throw Error(
          `Unknown consensus client for network ${network}: ${consensusClient}`
        );
    }
    return {
      network,
      executionClient,
      consensusClient,
      executionClientUrl,
      validatorUrl,
      beaconchainUrl,
      beaconchaUrl: `https://beaconcha.in`,
      signerUrl: `http://web3signer.web3signer.dappnode:9000`,
      token,
      host: `brain.web3signer.dappnode`,
      defaultFeeRecipient:
        defaultFeeRecipient && isValidEcdsaPubkey(defaultFeeRecipient)
          ? defaultFeeRecipient
          : undefined,
      tlsCert,
    };
  } else if (network === "gnosis") {
    const { executionClient, consensusClient, defaultFeeRecipient } =
      loadEnvs("gnosis");
    switch (executionClient) {
      case "nethermind-xdai.dnp.dappnode.eth":
        executionClientUrl = `http://nethermind-xdai.dappnode:8545`;
        break;
      default:
        throw Error(
          `Unknown execution client for network ${network}: ${executionClient}`
        );
    }
    switch (consensusClient) {
      case "gnosis-beacon-chain-prysm.dnp.dappnode.eth":
        token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg`;
        beaconchainUrl = `http://beacon-chain.gnosis-beacon-chain-prysm.dappnode:3500`;
        validatorUrl = `http://validator.gnosis-beacon-chain-prysm.dappnode:3500`;
        break;
      case "teku-gnosis.dnp.dappnode.eth":
        token = `cd4892ca35d2f5d3e2301a65fc7aa660`;
        beaconchainUrl = `http://beacon-chain.teku-gnosis.dappnode:3500`;
        validatorUrl = `https://validator.teku-gnosis.dappnode:3500`;
        tlsCert = fs.readFileSync(
          path.join(certDir, "gnosis", "teku_client_keystore.p12")
        );
        break;
      case "lighthouse-gnosis.dnp.dappnode.eth":
        token = `api-token-0x0200e6ce18e26fd38caca7ae1bfb9e2bba7efb20ed2746ad17f2f6dda44603152d`;
        beaconchainUrl = `http://beacon-chain.lighthouse-gnosis.dappnode:3500`;
        validatorUrl = `http://validator.lighthouse-gnosis.dappnode:3500`;
        break;
      case "lodestar-gnosis.dnp.dappnode.eth":
        token = `api-token-0x7fd16fff6453982a5d8bf14617e7823b68cd18ade59985befe64e0a659300e7d`;
        beaconchainUrl = `http://beacon-chain.lodestar-gnosis.dappnode:3500`;
        validatorUrl = `http://validator.lodestar-gnosis.dappnode:3500`;
        break;
      default:
        throw Error(
          `Unknown consensus client for network ${network}: ${consensusClient}`
        );
    }
    return {
      network,
      executionClient,
      consensusClient,
      executionClientUrl,
      validatorUrl,
      beaconchainUrl,
      beaconchaUrl: `https://gnosischa.in`,
      signerUrl: `http://web3signer.web3signer-gnosis.dappnode:9000`,
      token,
      host: `brain.web3signer-gnosis.dappnode`,
      defaultFeeRecipient:
        defaultFeeRecipient && isValidEcdsaPubkey(defaultFeeRecipient)
          ? defaultFeeRecipient
          : undefined,
      tlsCert,
    };
  } else if (network === "prater") {
    const { executionClient, consensusClient, defaultFeeRecipient } =
      loadEnvs("prater");
    switch (executionClient) {
      case "goerli-nethermind.dnp.dappnode.eth":
        executionClientUrl = `http://goerli-nethermind.dappnode:8545`;
        break;
      case "goerli-besu.dnp.dappnode.eth":
        executionClientUrl = `http://goerli-besu.dappnode:8545`;
        break;
      case "goerli-erigon.dnp.dappnode.eth":
        executionClientUrl = `http://goerli-erigon.dappnode:8545`;
      case "goerli-geth.dnp.dappnode.eth":
        executionClientUrl = `http://goerli-geth.dappnode:8545`;
        break;
      default:
        throw Error(
          `Unknown execution client for network ${network}: ${executionClient}`
        );
    }
    switch (consensusClient) {
      case "prysm-prater.dnp.dappnode.eth":
        token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg`;
        beaconchainUrl = `http://beacon-chain.prysm-prater.dappnode:3500`;
        validatorUrl = `http://validator.prysm-prater.dappnode:3500`;
        break;
      case "teku-prater.dnp.dappnode.eth":
        token = `cd4892ca35d2f5d3e2301a65fc7aa660`;
        beaconchainUrl = `http://beacon-chain.teku-prater.dappnode:3500`;
        validatorUrl = `https://validator.teku-prater.dappnode:3500`;
        tlsCert = fs.readFileSync(
          path.join(certDir, "prater", "teku_client_keystore.p12")
        );
        break;
      case "lighthouse-prater.dnp.dappnode.eth":
        token = `api-token-0x0200e6ce18e26fd38caca7ae1bfb9e2bba7efb20ed2746ad17f2f6dda44603152d`;
        beaconchainUrl = `http://beacon-chain.lighthouse-prater.dappnode:3500`;
        validatorUrl = `http://validator.lighthouse-prater.dappnode:3500`;
        break;
      case "lodestar-prater.dnp.dappnode.eth":
        token = `api-token-0x7fd16fff6453982a5d8bf14617e7823b68cd18ade59985befe64e0a659300e7d`;
        beaconchainUrl = `http://beacon-chain.lodestar-prater.dappnode:3500`;
        validatorUrl = `http://validator.lodestar-prater.dappnode:3500`;
        break;
      case "nimbus-prater.dnp.dappnode.eth":
        token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg`;
        beaconchainUrl = `http://beacon-validator.nimbus-prater.dappnode:4500`;
        validatorUrl = `http://beacon-validator.nimbus-prater.dappnode:3500`;
        break;
      default:
        throw Error(
          `Unknown consensus client for network ${network}: ${consensusClient}`
        );
    }

    return {
      network,
      executionClient,
      consensusClient,
      executionClientUrl,
      validatorUrl,
      beaconchainUrl,
      beaconchaUrl: `https://prater.beaconcha.in`,
      signerUrl: `http://web3signer.web3signer-prater.dappnode:9000`,
      token,
      host: `web3signer.web3signer-prater.dappnode`,
      defaultFeeRecipient:
        defaultFeeRecipient && isValidEcdsaPubkey(defaultFeeRecipient)
          ? defaultFeeRecipient
          : undefined,
      tlsCert,
    };
  } else if (network === "lukso") {
    const { executionClient, consensusClient, defaultFeeRecipient } =
      loadEnvs("lukso");
    switch (executionClient) {
      case "lukso-erigon.dnp.dappnode.eth":
        executionClientUrl = `http://lukso-erigon.dappnode:8545`;
      case "lukso-geth.dnp.dappnode.eth":
        executionClientUrl = `http://lukso-geth.dappnode:8545`;
        break;
      default:
        throw Error(
          `Unknown execution client for network ${network}: ${executionClient}`
        );
    }
    switch (consensusClient) {
      case "prysm-lukso.dnp.dappnode.eth":
        token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg`;
        beaconchainUrl = `http://beacon-chain.prysm-lukso.dappnode:3500`;
        validatorUrl = `http://validator.prysm-lukso.dappnode:3500`;
        break;
      case "lighthouse-lukso.dnp.dappnode.eth":
        token = `api-token-0x0200e6ce18e26fd38caca7ae1bfb9e2bba7efb20ed2746ad17f2f6dda44603152d`;
        beaconchainUrl = `http://beacon-chain.lighthouse-lukso.dappnode:3500`;
        validatorUrl = `http://validator.lighthouse-lukso.dappnode:3500`;
        break;
      default:
        throw Error(
          `Unknown consensus client for network ${network}: ${consensusClient}`
        );
    }

    return {
      network,
      executionClient,
      consensusClient,
      executionClientUrl,
      validatorUrl,
      beaconchainUrl,
      beaconchaUrl: `https://explorer.consensus.mainnet.lukso.network/`,
      signerUrl: `http://web3signer.web3signer-lukso.dappnode:9000`,
      token,
      host: `web3signer.web3signer-lukso.dappnode`,
      defaultFeeRecipient:
        defaultFeeRecipient && isValidEcdsaPubkey(defaultFeeRecipient)
          ? defaultFeeRecipient
          : undefined,
      tlsCert,
    };
  } else {
    throw Error(`Unknown network ${network}`);
  }
}

/**
 * Loads the environment variables and validates them. If are not set or are not valid, it throws an error
 * @returns StakerConfig<Network>
 */
function loadEnvs<T extends Network>(
  network: T
): {
  executionClient: ExecutionClient<T>;
  consensusClient: ConsensusClient<T>;
  defaultFeeRecipient?: string;
} {
  const errors = [];

  const defaultFeeRecipient =
    process.env[`_DAPPNODE_GLOBAL_FEE_RECIPIENT_${network.toUpperCase()}`];
  const executionClient =
    process.env[`_DAPPNODE_GLOBAL_EXECUTION_CLIENT_${network.toUpperCase()}`];
  const consensusClient =
    process.env[`_DAPPNODE_GLOBAL_CONSENSUS_CLIENT_${network.toUpperCase()}`];

  switch (network) {
    case "mainnet":
      if (
        !executionClientsMainnet.includes(
          executionClient as ExecutionClientMainnet
        )
      )
        errors.push(
          `Execution client is not valid for network ${network}: ${executionClient}. Valid execution clients for ${network}: ${executionClientsMainnet.join(
            ", "
          )}`
        );
      if (
        !consensusClientsMainnet.includes(
          consensusClient as ConsensusClientMainnet
        )
      )
        errors.push(
          `Consensus client is not valid for network ${network}: ${consensusClient}. Valid consensus clients for ${network}: ${consensusClientsMainnet.join(
            ", "
          )}`
        );

      break;
    case "prater":
      if (
        !executionClientsPrater.includes(
          executionClient as ExecutionClientPrater
        )
      )
        errors.push(
          `Execution client is not valid for network ${network}: ${executionClient}. Valid execution clients for ${network}: ${executionClientsPrater.join(
            ", "
          )}`
        );
      if (
        !consensusClientsPrater.includes(
          consensusClient as ConsensusClientPrater
        )
      )
        errors.push(
          `Consensus client is not valid for network ${network}: ${consensusClient}. Valid consensus clients for ${network}: ${consensusClientsPrater.join(
            ", "
          )}`
        );
      break;
    case "gnosis":
      if (
        !executionClientsGnosis.includes(
          executionClient as ExecutionClientGnosis
        )
      )
        errors.push(
          `Execution client is not valid for network ${network}: ${executionClient}. Valid execution clients for ${network}: ${executionClientsGnosis.join(
            ", "
          )}`
        );
      if (
        !consensusClientsGnosis.includes(
          consensusClient as ConsensusClientGnosis
        )
      )
        errors.push(
          `Consensus client is not valid for network ${network}: ${consensusClient}. Valid consensus clients for ${network}: ${consensusClientsGnosis.join(
            ", "
          )}`
        );
      break;
    case "lukso":
      if (
        !executionClientsLukso.includes(executionClient as ExecutionClientLukso)
      )
        errors.push(
          `Execution client is not valid for network ${network}: ${executionClient}. Valid execution clients for ${network}: ${executionClientsLukso.join(
            ", "
          )}`
        );
      if (
        !consensusClientsLukso.includes(consensusClient as ConsensusClientLukso)
      )
        errors.push(
          `Consensus client is not valid for network ${network}: ${consensusClient}. Valid consensus clients for ${network}: ${consensusClientsLukso.join(
            ", "
          )}`
        );
      break;
    default:
      errors.push(
        `NETWORK environment variable is not valid: ${network}. Valid NETWORK values: ${networks.join(
          ", "
        )}`
      );
  }

  if (errors.length) throw Error(errors.join("\n\n"));

  return {
    executionClient: executionClient as ExecutionClient<T>,
    consensusClient: consensusClient as ConsensusClient<T>,
    defaultFeeRecipient,
  };
}

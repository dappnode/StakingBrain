import { BlockExplorerApi } from "./blockExplorer/index.js";
import { DappmanagerApi } from "./dappmanager/index.js";
import { PrometheusApi } from "./prometheus/index.js";
import { BeaconchainApi } from "./beaconchain/index.js";
import { ValidatorApi } from "./validator/index.js";
import { Web3SignerApi } from "./signer/index.js";
import { PostgresClient } from "./postgres/index.js";
import { BrainConfig } from "../config/types.js";
import { DappnodeSignatureVerifier } from "./signatureVerifier/index.js";

export {
  BlockExplorerApi,
  DappmanagerApi,
  PrometheusApi,
  BeaconchainApi,
  ValidatorApi,
  Web3SignerApi,
  PostgresClient,
  DappnodeSignatureVerifier
};

export const getApiClients = (brainConfig: BrainConfig) => {
  const {
    prometheusUrl,
    signerUrl,
    blockExplorerUrl,
    validatorUrl,
    beaconchainUrl,
    dappmanagerUrl,
    postgresUrl,
    token,
    tlsCert,
    host
  } = brainConfig.apis;
  const { minGenesisTime, secondsPerSlot, slotsPerEpoch, network } = brainConfig.chain;
  return {
    prometheusApi: new PrometheusApi({
      baseUrl: prometheusUrl,
      minGenesisTime,
      secondsPerSlot,
      slotsPerEpoch,
      network
    }),
    signerApi: new Web3SignerApi(
      {
        baseUrl: signerUrl,
        authToken: token,
        host
      },
      network
    ),
    blockExplorerApi: new BlockExplorerApi({ baseUrl: blockExplorerUrl }, network),
    validatorApi: new ValidatorApi(
      {
        baseUrl: validatorUrl,
        authToken: token,
        tlsCert
      },
      network
    ),
    beaconchainApi: new BeaconchainApi({ baseUrl: beaconchainUrl }, network),
    dappmanagerApi: new DappmanagerApi({ baseUrl: dappmanagerUrl }, network),
    postgresClient: new PostgresClient(postgresUrl)
  };
};

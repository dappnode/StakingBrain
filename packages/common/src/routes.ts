import {
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerPostResponse,
  Web3signerPostRequest,
  Web3signerDeleteRequest,
  Web3signerHealthcheckResponse,
} from "./types/api/web3signer/types.js";
import { BeaconchaGetResponse } from "./types/api/beaconchain/types.js";
import { StakerConfig, Network } from "./types/network/types.js";

export interface Routes {
  testRoute: () => Promise<string>;
  // BeaconchaApi
  fetchAllValidatorsInfo: (
    keystoresGet: Web3signerGetResponse
  ) => Promise<BeaconchaGetResponse[]>;
  fetchValidatorsInfo: (pubkeys: string[]) => Promise<BeaconchaGetResponse>;
  // SignerApi
  importKeystores: (
    postRequest: Web3signerPostRequest
  ) => Promise<Web3signerPostResponse>;
  deleteKeystores: (
    deleteRequest: Web3signerDeleteRequest
  ) => Promise<Web3signerDeleteResponse>;
  getKeystores: () => Promise<Web3signerGetResponse>;
  getStatus: () => Promise<Web3signerHealthcheckResponse>;
  // Network
  getStakerConfig: () => Promise<StakerConfig<Network>>;
}

interface RouteData {
  log?: boolean;
}

export const routesData: { [P in keyof Routes]: RouteData } = {
  testRoute: { log: true },
  fetchAllValidatorsInfo: { log: true },
  fetchValidatorsInfo: { log: true },
  importKeystores: { log: true },
  deleteKeystores: { log: true },
  getKeystores: { log: true },
  getStatus: { log: true },
  getStakerConfig: { log: true },
};

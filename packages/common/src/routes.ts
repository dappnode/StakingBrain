import {
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerPostResponse,
  Web3signerDeleteRequest,
  Web3signerHealthcheckResponse,
  Web3signerPostRequestFromUi,
} from "./types/api/web3signer/types.js";
import { BeaconchaGetResponse } from "./types/api/beaconchain/types.js";
import { StakerConfig, Network } from "./types/network/types.js";

export interface Routes {
  // BeaconchaApi
  beaconchaFetchAllValidatorsInfo: (
    keystoresGet: Web3signerGetResponse
  ) => Promise<BeaconchaGetResponse[]>;
  beaconchaFetchValidatorsInfo: (
    pubkeys: string[]
  ) => Promise<BeaconchaGetResponse>;
  // SignerApi
  importValidators: (
    postRequest: Web3signerPostRequestFromUi
  ) => Promise<Web3signerPostResponse>;
  deleteValidators: (
    deleteRequest: Web3signerDeleteRequest
  ) => Promise<Web3signerDeleteResponse>;
  getValidators: () => Promise<Web3signerGetResponse>;
  signerGetStatus: () => Promise<Web3signerHealthcheckResponse>;
  // Network
  getStakerConfig: () => Promise<StakerConfig<Network>>;
}

interface RouteData {
  log?: boolean;
}

export const routesData: { [P in keyof Routes]: RouteData } = {
  beaconchaFetchAllValidatorsInfo: { log: true },
  beaconchaFetchValidatorsInfo: { log: true },
  importValidators: { log: true },
  deleteValidators: { log: true },
  getValidators: { log: true },
  signerGetStatus: { log: true },
  getStakerConfig: { log: true },
};

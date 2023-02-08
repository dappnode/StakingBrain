import {
  Web3signerDeleteResponse,
  Web3signerDeleteRequest,
  Web3signerHealthcheckResponse,
  CustomValidatorsImportRequest,
  BeaconchaGetResponse,
  StakerConfig,
  Network,
  CustomValidatorGetResponse,
  Web3signerPostResponse,
  Tag,
} from "./index.js";

export interface Routes {
  // BeaconchaApi
  beaconchaFetchAllValidatorsInfo: (
    pubkeys: string[]
  ) => Promise<BeaconchaGetResponse[]>;
  beaconchaFetchValidatorsInfo: (
    pubkeys: string[]
  ) => Promise<BeaconchaGetResponse>;
  // SignerApi
  importValidators: (
    postRequest: CustomValidatorsImportRequest
  ) => Promise<Web3signerPostResponse>;
  updateValidators: ({
    pubkeys,
    feeRecipients,
    tags,
  }: {
    pubkeys: string[];
    feeRecipients: string[];
    tags: Tag[];
  }) => Promise<void>;
  deleteValidators: (
    deleteRequest: Web3signerDeleteRequest
  ) => Promise<Web3signerDeleteResponse>;
  getValidators: () => Promise<CustomValidatorGetResponse[]>;
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
  updateValidators: { log: true },
  deleteValidators: { log: true },
  getValidators: { log: true },
  signerGetStatus: { log: true },
  getStakerConfig: { log: true },
};

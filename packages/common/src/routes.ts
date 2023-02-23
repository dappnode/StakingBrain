import {
  Web3signerDeleteResponse,
  Web3signerDeleteRequest,
  Web3signerHealthcheckResponse,
  CustomImportRequest,
  BeaconchaGetResponse,
  StakerConfig,
  Network,
  CustomValidatorGetResponse,
  Web3signerPostResponse,
  CustomValidatorUpdateRequest,
  ValidatorExitExecute,
  BeaconchainPoolVoluntaryExitsPostRequest,
} from "./index.js";

export interface Routes {
  // BeaconchaApi
  beaconchaFetchAllValidatorsInfo: (
    pubkeys: string[]
  ) => Promise<BeaconchaGetResponse[]>;
  beaconchaFetchValidatorsInfo: (
    pubkeys: string[]
  ) => Promise<BeaconchaGetResponse>;
  // Validators
  importValidators: (
    postRequest: CustomImportRequest
  ) => Promise<Web3signerPostResponse>;
  updateValidators: (
    updateRequest: CustomValidatorUpdateRequest[]
  ) => Promise<void>;
  deleteValidators: (
    deleteRequest: Web3signerDeleteRequest
  ) => Promise<Web3signerDeleteResponse>;
  getValidators: () => Promise<CustomValidatorGetResponse[]>;
  signerGetStatus: () => Promise<Web3signerHealthcheckResponse>;
  getExitValidators: ({
    pubkeys,
  }: {
    pubkeys: string[];
  }) => Promise<BeaconchainPoolVoluntaryExitsPostRequest[]>;
  exitValidators: ({
    pubkeys,
  }: {
    pubkeys: string[];
  }) => Promise<ValidatorExitExecute[]>;
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
  exitValidators: { log: true },
  getExitValidators: { log: true },
  signerGetStatus: { log: true },
  getStakerConfig: { log: true },
};

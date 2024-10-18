import { StakerConfig, Tag } from "@stakingbrain/common";
import type {
  BeaconchaGetResponse,
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  ValidatorExitExecute,
  BeaconchainPoolVoluntaryExitsPostRequest,
  Web3signerPostResponse,
  Web3signerHealthcheckResponse,
  EpochsValidatorsData
} from "../../../apiClients/types.js";
import { NumberOfDaysToQuery } from "../../../validatorsDataIngest/types.js";

// Define the type for RPC methods
export interface RpcMethods {
  beaconchaFetchAllValidatorsInfo: (pubkeys: string[]) => Promise<BeaconchaGetResponse[]>;
  beaconchaFetchValidatorsInfo: (pubkeys: string[]) => Promise<BeaconchaGetResponse>;
  deleteValidators: (deleteRequest: Web3signerDeleteRequest) => Promise<Web3signerDeleteResponse>;
  exitValidators: (pubkeys: string[]) => Promise<ValidatorExitExecute[]>;
  getExitValidators: (pubkeys: string[]) => Promise<BeaconchainPoolVoluntaryExitsPostRequest[]>;
  importValidators: (postRequest: CustomImportRequest) => Promise<Web3signerPostResponse>;
  updateValidators: (
    customValidatorUpdateRequest: CustomValidatorUpdateRequest[],
    requestFrom?: ActionRequestOrigin
  ) => Promise<void>;
  getValidators: () => Promise<CustomValidatorGetResponse[]>;
  signerGetStatus: () => Promise<Web3signerHealthcheckResponse>;
  getStakerConfig: () => Promise<StakerConfig>;
  fetchValidatorsPerformanceData: (
    validatorIndexes: string[],
    numberOfDaysToQuery?: NumberOfDaysToQuery
  ) => Promise<EpochsValidatorsData>;
}

export type ActionRequestOrigin = "ui" | "api";

export interface CustomImportRequest {
  validatorsImportRequest: CustomValidatorImportRequest[];
  importFrom: ActionRequestOrigin;
  slashing_protection?: File | string;
}
export interface CustomValidatorImportRequest {
  tag: Tag;
  feeRecipient: string;
  keystore: File | string;
  password: string;
}

export interface CustomValidatorUpdateRequest {
  pubkey: string;
  feeRecipient: string;
}

export type WithdrawalCredentialsFormat = "ecdsa" | "bls" | "unknown" | "error";
export interface CustomValidatorGetResponse {
  pubkey: string;
  index: string;
  tag: Tag;
  feeRecipient: string;
  withdrawalCredentials: {
    format: WithdrawalCredentialsFormat;
    address: string;
  };
  signerImported?: boolean;
  validatorImported?: boolean;
  validatorFeeRecipientCorrect?: boolean;
}

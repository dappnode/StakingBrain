import type {
  BeaconchaGetResponse,
  BeaconchainPoolVoluntaryExitsPostRequest,
  CustomImportRequest,
  CustomValidatorGetResponse,
  CustomValidatorUpdateRequest,
  ValidatorExitExecute,
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerHealthcheckResponse,
  Web3signerPostResponse,
  ValidatorsDataProcessed,
  NumberOfDaysToQuery,
  Granularity
} from "@stakingbrain/brain";
import { StakerConfig } from "@stakingbrain/common";

// Define the type for RPC methods
export interface RpcMethods {
  // BeaconchaApi
  beaconchaFetchAllValidatorsInfo: (pubkeys: string[]) => Promise<BeaconchaGetResponse[]>;
  beaconchaFetchValidatorsInfo: (pubkeys: string[]) => Promise<BeaconchaGetResponse>;
  // Validators
  importValidators: (postRequest: CustomImportRequest) => Promise<Web3signerPostResponse>;
  updateValidators: (updateRequest: CustomValidatorUpdateRequest[]) => Promise<void>;
  deleteValidators: (deleteRequest: Web3signerDeleteRequest) => Promise<Web3signerDeleteResponse>;
  getValidators: () => Promise<CustomValidatorGetResponse[]>;
  signerGetStatus: () => Promise<Web3signerHealthcheckResponse>;
  getExitValidators: ({ pubkeys }: { pubkeys: string[] }) => Promise<BeaconchainPoolVoluntaryExitsPostRequest[]>;
  exitValidators: ({ pubkeys }: { pubkeys: string[] }) => Promise<ValidatorExitExecute[]>;
  fetchValidatorsPerformanceData: ({
    validatorIndexes,
    numberOfDaysToQuery,
    granularity
  }: {
    validatorIndexes: string[];
    numberOfDaysToQuery?: NumberOfDaysToQuery;
    granularity?: Granularity;
  }) => Promise<Map<number, ValidatorsDataProcessed>>;
  // Network
  getStakerConfig: () => Promise<StakerConfig>;
}

export type RpcMethodNames = keyof RpcMethods;

type ReplaceVoidWithNull<T> = T extends void ? null : T;

export type RoutesArguments = {
  [K in keyof RpcMethods]: Parameters<RpcMethods[K]> extends [] ? undefined : Parameters<RpcMethods[K]>[0];
};

// Unwraps the inner type of a Promise
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

export type RoutesReturn = {
  [K in keyof RpcMethods]: ReplaceVoidWithNull<UnwrapPromise<ReturnType<RpcMethods[K]>>>;
};

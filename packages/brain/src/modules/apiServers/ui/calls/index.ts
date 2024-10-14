import { beaconchaFetchAllValidatorsInfo, beaconchaFetchValidatorsInfo } from "./beaconchaApi.js";
import { fetchValidatorsPerformanceData } from "./fetchValidatorsPerformanceData.js";
import { deleteValidators } from "./deleteValidators.js";
import { exitValidators, getExitValidators } from "./exitValidators.js";
import { importValidators } from "./importValidators.js";
import { updateValidators } from "./updateValidators.js";
import { getValidators } from "./getValidators.js";
import { signerGetStatus } from "./signerGetStatus.js";
import { getStakerConfig } from "./getStakerConfig.js";
import {
  BlockExplorerApi,
  BeaconchainApi,
  Web3SignerApi,
  ValidatorApi,
  PostgresClient
} from "../../../apiClients/index.js";
import { BrainDataBase } from "../../../db/index.js";
import { CronJob } from "../../../cron/cron.js";
import { ConsensusClient, ExecutionClient, Network } from "@stakingbrain/common";
import { ActionRequestOrigin, CustomImportRequest, CustomValidatorUpdateRequest, RpcMethods } from "./types.js";
import { Web3signerDeleteRequest } from "../../../apiClients/types.js";
import { NumberOfDaysToQuery } from "../../../validatorsDataIngest/types.js";

export const createRpcMethods = ({
  postgresClient,
  blockExplorerApi,
  beaconchainApi,
  validatorApi,
  signerApi,
  brainDb,
  reloadValidatorsCron,
  network,
  signerUrl,
  beaconchainUrl,
  isMevBoostSet,
  executionClientUrl,
  validatorUrl,
  executionClient,
  consensusClient,
  minGenesisTime,
  secondsPerSlot
}: {
  postgresClient: PostgresClient;
  blockExplorerApi: BlockExplorerApi;
  beaconchainApi: BeaconchainApi;
  validatorApi: ValidatorApi;
  signerApi: Web3SignerApi;
  brainDb: BrainDataBase;
  reloadValidatorsCron: CronJob;
  network: Network;
  signerUrl: string;
  beaconchainUrl: string;
  isMevBoostSet: boolean;
  executionClientUrl: string;
  validatorUrl: string;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  minGenesisTime: number;
  secondsPerSlot: number;
}): RpcMethods => ({
  beaconchaFetchAllValidatorsInfo: async (pubkeys: string[]) =>
    await beaconchaFetchAllValidatorsInfo({ blockExplorerApi, pubkeys }),
  beaconchaFetchValidatorsInfo: async (pubkeys: string[]) =>
    await beaconchaFetchValidatorsInfo({ blockExplorerApi, pubkeys }),
  deleteValidators: async (deleteRequest: Web3signerDeleteRequest) =>
    await deleteValidators({ brainDb, reloadValidatorsCron, validatorApi, signerApi, deleteRequest }),
  exitValidators: async (pubkeys: string[]) => await exitValidators({ pubkeys, beaconchainApi, signerApi }),
  getExitValidators: async (pubkeys: string[]) => await getExitValidators({ beaconchainApi, signerApi, pubkeys }),
  importValidators: async (postRequest: CustomImportRequest) =>
    await importValidators({
      postRequest,
      reloadValidatorsCron,
      network,
      signerApi,
      validatorApi,
      signerUrl,
      brainDb
    }),
  updateValidators: async (
    customValidatorUpdateRequest: CustomValidatorUpdateRequest[],
    requestFrom?: ActionRequestOrigin
  ) =>
    await updateValidators({ reloadValidatorsCron, brainDb, validatorApi, customValidatorUpdateRequest, requestFrom }),
  getValidators: async () =>
    await getValidators({
      brainDb,
      validatorApi,
      signerApi,
      beaconchainApi
    }),
  signerGetStatus: async () => await signerGetStatus({ signerApi }),
  getStakerConfig: async () =>
    await getStakerConfig({
      beaconchainUrl,
      executionClientUrl,
      isMevBoostSet,
      network,
      signerUrl,
      validatorUrl,
      executionClient,
      consensusClient
    }),
  fetchValidatorsPerformanceData: async (validatorIndexes: string[], numberOfDaysToQuery?: NumberOfDaysToQuery) =>
    await fetchValidatorsPerformanceData({
      postgresClient,
      secondsPerSlot,
      minGenesisTime,
      numberOfDaysToQuery,
      validatorIndexes
    })
});

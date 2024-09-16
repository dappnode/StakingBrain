import { beaconchaFetchAllValidatorsInfo, beaconchaFetchValidatorsInfo } from "./beaconchaApi.js";
import { deleteValidators } from "./deleteValidators.js";
import { exitValidators, getExitValidators } from "./exitValidators.js";
import { importValidators } from "./importValidators.js";
import { updateValidators } from "./updateValidators.js";
import { getValidators } from "./getValidators.js";
import { signerGetStatus } from "./signerGetStatus.js";
import { getStakerConfig } from "./getStakerConfig.js";

export const rpcMethods = {
  beaconchaFetchAllValidatorsInfo,
  beaconchaFetchValidatorsInfo,
  deleteValidators,
  exitValidators,
  getExitValidators,
  importValidators,
  updateValidators,
  getValidators,
  signerGetStatus,
  getStakerConfig
};

export type RpcMethodNames = keyof typeof rpcMethods;

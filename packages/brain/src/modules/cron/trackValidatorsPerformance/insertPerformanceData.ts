import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { PostgresClient } from "../../apiClients/index.js";
import {
  BlockProposalStatus,
  ValidatorPerformance,
  ValidatorPerformanceError,
  ValidatorPerformanceErrorCode
} from "../../apiClients/postgres/types.js";
import { TotalRewards } from "../../apiClients/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Insert the performance data for the validators in the Postgres DB. On any error
 * inserting the performance of a validator, the error will be logged and the process will continue
 * with the next validator.
 *
 * @param postgresClient - Postgres client to interact with the DB.
 * @param activeValidatorIndexes - Array of validator indexes.
 * @param currentEpoch - The current epoch.
 * @param validatorBlockStatusMap - Map with the block proposal status of each validator.
 * @param validatorsAttestationsTotalRewards - Array of total rewards for the validators.
 */
export async function insertPerformanceData({
  postgresClient,
  activeValidatorsIndexes,
  currentEpoch,
  validatorBlockStatusMap,
  validatorsAttestationsTotalRewards,
  executionClient,
  consensusClient,
  error
}: {
  postgresClient: PostgresClient;
  activeValidatorsIndexes: string[];
  currentEpoch: number;
  validatorBlockStatusMap: Map<string, BlockProposalStatus>;
  validatorsAttestationsTotalRewards: TotalRewards[];
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  error?: ValidatorPerformanceError;
}): Promise<void> {
  for (const validatorIndex of activeValidatorsIndexes) {
    if (error) {
      await insertDataNotThrow({
        postgresClient,
        validatorPerformance: {
          validatorIndex: parseInt(validatorIndex),
          epoch: currentEpoch,
          executionClient,
          consensusClient,
          error
        }
      });
      continue;
    }

    const attestationsTotalRewards = validatorsAttestationsTotalRewards.find(
      (attestationReward) => attestationReward.validator_index === validatorIndex
    );
    if (!attestationsTotalRewards) {
      await insertDataNotThrow({
        postgresClient,
        validatorPerformance: {
          validatorIndex: parseInt(validatorIndex),
          epoch: currentEpoch,
          executionClient,
          consensusClient,
          error: {
            code: ValidatorPerformanceErrorCode.MISSING_ATT_DATA,
            message: `Missing attestation data for validator ${validatorIndex}`
          }
        }
      });
      continue;
    }

    const blockProposalStatus = validatorBlockStatusMap.get(validatorIndex);
    if (!blockProposalStatus) {
      await insertDataNotThrow({
        postgresClient,
        validatorPerformance: {
          validatorIndex: parseInt(validatorIndex),
          epoch: currentEpoch,
          executionClient,
          consensusClient,
          error: {
            code: ValidatorPerformanceErrorCode.MISSING_BLOCK_DATA,
            message: `Missing block proposal data for validator ${validatorIndex}`
          }
        }
      });
      continue;
    }

    await insertDataNotThrow({
      postgresClient,
      validatorPerformance: {
        validatorIndex: parseInt(validatorIndex),
        epoch: currentEpoch,
        executionClient,
        consensusClient,
        blockProposalStatus,
        attestationsTotalRewards
      }
    });
  }
}

/**
 * Helper function to insert error data for a specific validator. On any error inserting the error
 * data, the error will be logged and the process will continue with the next validator.
 */
async function insertDataNotThrow({
  postgresClient,
  validatorPerformance
}: {
  postgresClient: PostgresClient;
  validatorPerformance: ValidatorPerformance;
}): Promise<void> {
  try {
    logger.debug(`${logPrefix}Inserting data for validator ${validatorPerformance.validatorIndex}`);
    await postgresClient.insertPerformanceData(validatorPerformance);
    logger.debug(`${logPrefix}Data inserted for epoch ${validatorPerformance.epoch}`);
  } catch (e) {
    logger.error(`${logPrefix}Error inserting data for validator ${validatorPerformance.validatorIndex}: ${e}`);
  }
}

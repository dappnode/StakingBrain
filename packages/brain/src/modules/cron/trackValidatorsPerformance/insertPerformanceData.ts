import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { PostgresClient } from "../../apiClients/index.js";
import { BlockProposalStatus, EpochError, EpochErrorCode } from "../../apiClients/postgres/types.js";
import { IdealRewards, TotalRewards } from "../../apiClients/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";
import type { DataPerEpochInsert } from "../../apiClients/postgres/types.js";

/**
 * Insert the performance data for the validators in the Postgres DB. On any error
 * inserting the performance of a validator, the error will be logged and the process will continue
 * with the next validator.
 */
export async function insertPerformanceData({
  executionClient,
  consensusClient,
  postgresClient,
  currentEpoch,
  activeValidatorsIndexes,
  validatorBlockStatusMap,
  validatorAttestationsRewards,
  error
}: {
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  postgresClient: PostgresClient;
  currentEpoch: number;
  activeValidatorsIndexes: string[];
  validatorBlockStatusMap?: Map<string, BlockProposalStatus>;
  validatorAttestationsRewards?: { totalRewards: TotalRewards[]; idealRewards: IdealRewards };
  error?: EpochError;
}): Promise<void> {
  const dataPerEpoch: DataPerEpochInsert[] = [];

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

    const attestationsTotalRewards = validatorAttestationsRewards?.totalRewards.find(
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
            code: EpochErrorCode.MISSING_ATT_DATA,
            message: `Missing attestation data for validator ${validatorIndex}`
          }
        }
      });
      continue;
    }

    const blockProposalStatus = validatorBlockStatusMap?.get(validatorIndex);
    if (!blockProposalStatus) {
      await insertDataNotThrow({
        postgresClient,
        validatorPerformance: {
          validatorIndex: parseInt(validatorIndex),
          epoch: currentEpoch,
          executionClient,
          consensusClient,
          error: {
            code: EpochErrorCode.MISSING_BLOCK_DATA,
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
  dataPerEpoch
}: {
  postgresClient: PostgresClient;
  dataPerEpoch: DataPerEpochInsert[];
}): Promise<void> {
  try {
    logger.debug(`${logPrefix}Inserting data for validator ${validatorPerformance.validatorIndex}`);
    await postgresClient.insertEpochData(dataPerEpoch);
    logger.debug(`${logPrefix}Data inserted for epoch ${validatorPerformance.epoch}`);
  } catch (e) {
    logger.error(`${logPrefix}Error inserting data for validator ${validatorPerformance.validatorIndex}: ${e}`);
  }
}

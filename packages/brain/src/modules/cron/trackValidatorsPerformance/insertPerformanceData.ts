import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { PostgresClient } from "../../apiClients/index.js";
import { BlockProposalStatus } from "../../apiClients/postgres/types.js";
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
 * @param epochFinalized - The epoch finalized.
 * @param validatorBlockStatusMap - Map with the block proposal status of each validator.
 * @param validatorsAttestationsTotalRewards - Array of total rewards for the validators.
 */
export async function insertPerformanceDataNotThrow({
  postgresClient,
  activeValidatorsIndexes,
  epochFinalized,
  validatorBlockStatusMap,
  validatorsAttestationsTotalRewards,
  executionClient,
  consensusClient,
  error
}: {
  postgresClient: PostgresClient;
  activeValidatorsIndexes: string[];
  epochFinalized: number;
  validatorBlockStatusMap: Map<string, BlockProposalStatus>;
  validatorsAttestationsTotalRewards: TotalRewards[];
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  error?: Error;
}): Promise<void> {
  for (const validatorIndex of activeValidatorsIndexes) {
    //const liveness = validatorsLiveness.find((liveness) => liveness.index === validatorIndex)?.is_live;
    const attestationsTotalRewards = validatorsAttestationsTotalRewards.find(
      (attestationReward) => attestationReward.validator_index === validatorIndex
    );

    if (!attestationsTotalRewards) {
      logger.error(`${logPrefix}Missing data for validator ${validatorIndex}, att: ${attestationsTotalRewards}`);
      continue;
    }

    const blockProposalStatus = validatorBlockStatusMap.get(validatorIndex);
    if (!blockProposalStatus) {
      logger.error(
        `${logPrefix}Missing block proposal data for validator ${validatorIndex}, block: ${blockProposalStatus}`
      );
      continue;
    }

    try {
      logger.debug(`${logPrefix}Inserting performance data for validator ${validatorIndex}`);
      await postgresClient.insertPerformanceData({
        validatorIndex: parseInt(validatorIndex),
        epoch: epochFinalized,
        blockProposalStatus,
        attestationsTotalRewards,
        error: error?.message,
        executionClient,
        consensusClient
      });
      logger.debug(`${logPrefix}Performance data inserted for epoch ${epochFinalized}`);
    } catch (e) {
      logger.error(`${logPrefix}Error inserting performance data for validator ${validatorIndex}: ${e}`);
      continue;
    }
  }
}

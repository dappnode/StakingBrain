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
 * @param validatorIndexes - Array of validator indexes.
 * @param epochFinalized - The epoch finalized.
 * @param validatorBlockStatus - Map with the block proposal status of each validator.
 * @param validatorsAttestationsTotalRewards - Array of total rewards for the validators.
 */
export async function insertPerformanceDataNotThrow({
  postgresClient,
  validatorIndexes,
  epochFinalized,
  validatorBlockStatus,
  validatorsAttestationsTotalRewards,
  executionClient,
  consensusClient,
  error
}: {
  postgresClient: PostgresClient;
  validatorIndexes: string[];
  epochFinalized: number;
  validatorBlockStatus: Map<string, BlockProposalStatus>;
  validatorsAttestationsTotalRewards: TotalRewards[];
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  error?: Error;
}): Promise<void> {
  for (const validatorIndex of validatorIndexes) {
    //const liveness = validatorsLiveness.find((liveness) => liveness.index === validatorIndex)?.is_live;
    const attestationsTotalRewards = validatorsAttestationsTotalRewards.find(
      (attestationReward) => attestationReward.validator_index === validatorIndex
    );

    if (!attestationsTotalRewards) {
      logger.error(`${logPrefix}Missing data for validator ${validatorIndex}, att: ${attestationsTotalRewards}`);
      continue;
    }

    const blockProposalStatus = validatorBlockStatus.get(validatorIndex);
    if (!blockProposalStatus) {
      logger.error(
        `${logPrefix}Missing block proposal data for validator ${validatorIndex}, block: ${blockProposalStatus}`
      );
      continue;
    }

    // write on db
    logger.debug(`${logPrefix}Inserting performance data for validator ${validatorIndex}`);
    try {
      await postgresClient.insertPerformanceData({
        validatorIndex: parseInt(validatorIndex),
        epoch: epochFinalized,
        blockProposalStatus,
        attestationsTotalRewards,
        error: error?.message,
        executionClient,
        consensusClient
      });
    } catch (e) {
      logger.error(`${logPrefix}Error inserting performance data for validator ${validatorIndex}: ${e}`);
      continue;
    }
  }
}

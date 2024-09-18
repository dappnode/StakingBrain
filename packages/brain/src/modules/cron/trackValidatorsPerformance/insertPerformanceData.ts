import { PostgresClient } from "../../apiClients/index.js";
import { BlockProposalStatus } from "../../apiClients/postgres/types.js";
import { TotalRewards } from "../../apiClients/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Insert the performance data for the validators in the Postgres DB.
 *
 * @param postgresClient - Postgres client to interact with the DB.
 * @param validatorIndexes - Array of validator indexes.
 * @param epochFinalized - The epoch finalized.
 * @param validatorBlockStatus - Map with the block proposal status of each validator.
 * @param validatorsAttestationsRewards - Array of total rewards for the validators.
 */
export async function insertPerformanceData({
  postgresClient,
  validatorIndexes,
  epochFinalized,
  validatorBlockStatus,
  validatorsAttestationsRewards
}: {
  postgresClient: PostgresClient;
  validatorIndexes: string[];
  epochFinalized: number;
  validatorBlockStatus: Map<string, BlockProposalStatus>;
  validatorsAttestationsRewards: TotalRewards[];
}): Promise<void> {
  for (const validatorIndex of validatorIndexes) {
    //const liveness = validatorsLiveness.find((liveness) => liveness.index === validatorIndex)?.is_live;
    const attestationsRewards = validatorsAttestationsRewards.find(
      (attestationReward) => attestationReward.validator_index === validatorIndex
    );

    if (!attestationsRewards) {
      logger.error(`${logPrefix}Missing data for validator ${validatorIndex}, att: ${attestationsRewards}`);
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
    await postgresClient.insertPerformanceData({
      validatorIndex: parseInt(validatorIndex),
      epoch: epochFinalized,
      blockProposalStatus: blockProposalStatus,
      attestationsRewards
    });
  }
}

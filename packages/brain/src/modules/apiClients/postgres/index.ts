import postgres from "postgres";
import logger from "../../logger/index.js";
import { BlockProposalStatus, ValidatorPerformance } from "./types.js";
import { PostgresApiError } from "./error.js";
import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";

enum Columns {
  validatorIndex = "validator_index",
  epoch = "epoch",
  executionClient = "execution_client",
  consensusClient = "consensus_client",
  slot = "slot",
  liveness = "liveness",
  blockProposalStatus = "block_proposal_status",
  syncCommitteeRewards = "sync_comittee_rewards",
  attestationsRewards = "attestations_rewards",
  error = "error"
}

export class PostgresClient {
  private readonly tableName = "validators_performance";
  private sql: postgres.Sql;

  /**
   * Initialize the client with the given database URL.
   *
   * @param dbUrl - The URL of the database to connect to. It must contain the username, password, host, port, and database name.
   * @example "postgres://username:password@localhost:5432/database"
   */
  constructor(dbUrl: string) {
    this.sql = postgres(dbUrl, {
      // Enable connection pooling by setting the max number of connections
      ssl: false, // Enable SSL if required
      max: 10 // Maximum number of connections
    });
  }

  /**
   * Get table size from the database in bytes.
   */
  public async getTableSize(): Promise<number> {
    const query = `
SELECT pg_total_relation_size('${this.tableName}');
    `;
    try {
      const result = await this.sql.unsafe(query);
      return result[0].pg_total_relation_size;
    } catch (err) {
      throw new PostgresApiError(`Error getting table size: ${err.message}`);
    }
  }

  /**
   * Initializes the database by creating the required table if it does not exist.
   * The table will have the following columns:
   * - validator_index: The index of the validator.
   * - epoch: The epoch number.
   * - slot: The slot number.
   * - liveness: The liveness status of the validator.
   * - block_proposal_status: The status of the block proposal (missed, proposed, unchosen).
   * - sync_comittee_rewards: The rewards received by the validator for participating in the sync committee.
   * - attestations_rewards: The rewards received by the validator for participating in the attestations.
   * - error: Any error message related to the validator's performance fetch.
   * The primary key will be a combination of validator_index and epoch.
   */
  public async initialize() {
    const query = `
DO $$ 
BEGIN
  -- Check and create BLOCK_PROPOSAL_STATUS ENUM type if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BLOCK_PROPOSAL_STATUS') THEN
    CREATE TYPE BLOCK_PROPOSAL_STATUS AS ENUM('${BlockProposalStatus.Missed}', '${BlockProposalStatus.Proposed}', '${BlockProposalStatus.Unchosen}');
  END IF;

  -- Check and create EXECUTION_CLIENT ENUM type if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EXECUTION_CLIENT') THEN
    CREATE TYPE EXECUTION_CLIENT AS ENUM('${ExecutionClient.Besu}', '${ExecutionClient.Nethermind}', '${ExecutionClient.Geth}', '${ExecutionClient.Erigon}', '${ExecutionClient.Unknown}');
  END IF;

  -- Check and create CONSENSUS_CLIENT ENUM type if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CONSENSUS_CLIENT') THEN
    CREATE TYPE CONSENSUS_CLIENT AS ENUM('${ConsensusClient.Teku}', '${ConsensusClient.Prysm}', '${ConsensusClient.Lighthouse}', '${ConsensusClient.Nimbus}', '${ConsensusClient.Unknown}');
  END IF;
END $$;

-- Create the table if not exists
CREATE TABLE IF NOT EXISTS ${this.tableName} (
  ${Columns.validatorIndex} BIGINT NOT NULL,
  ${Columns.epoch} BIGINT NOT NULL,
  ${Columns.executionClient} EXECUTION_CLIENT NOT NULL,
  ${Columns.consensusClient} CONSENSUS_CLIENT NOT NULL,
  ${Columns.slot} BIGINT,
  ${Columns.liveness} BOOLEAN,
  ${Columns.blockProposalStatus} BLOCK_PROPOSAL_STATUS,
  ${Columns.syncCommitteeRewards} BIGINT,
  ${Columns.attestationsRewards} JSONB,
  ${Columns.error} TEXT,
  PRIMARY KEY (${Columns.validatorIndex}, ${Columns.epoch})
);
`;

    try {
      await this.sql.unsafe(query);
      logger.info("Table created or already exists.");
    } catch (err) {
      //TODO: what to do if initialize fails?
      logger.error("Error creating table:", err);
    }
  }

  /**
   * Delete database table.
   */
  public async deleteDatabaseTable() {
    const query = `
    DROP TABLE IF EXISTS ${this.tableName};
  `;
    try {
      await this.sql.unsafe(query);
      logger.info("Table deleted.");
    } catch (err) {
      logger.error("Error deleting table:", err);
    }
  }

  /**
   * Delete enum types.
   */
  public async deleteEnumTypes(): Promise<void> {
    const query = `
    DROP TYPE IF EXISTS BLOCK_PROPOSAL_STATUS;
    DROP TYPE IF EXISTS EXECUTION_CLIENT;
    DROP TYPE IF EXISTS CONSENSUS_CLIENT;
  `;
    try {
      await this.sql.unsafe(query);
      logger.info("Enum types deleted.");
    } catch (err) {
      logger.error("Error deleting enum types:", err);
    }
  }

  /**
   * Inserts the given performance data into the database.
   *
   * @param data - The performance data to insert.
   * @example insertPerformanceData({ validatorIndex: 1, epoch: 1, slot: 1, liveness: true, blockProposalStatus: "missed", syncCommitteeRewards: 100, attestationsRewards: { attestation1: 10, attestation2: 20 } })
   */
  public async insertPerformanceData(data: ValidatorPerformance): Promise<void> {
    const query = `
INSERT INTO ${this.tableName} (${Columns.validatorIndex}, ${Columns.epoch}, ${Columns.slot}, ${Columns.liveness}, ${Columns.blockProposalStatus}, ${Columns.syncCommitteeRewards}, ${Columns.attestationsRewards}, ${Columns.error})
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    try {
      await this.sql.unsafe(query, [
        data.validatorIndex,
        data.epoch,
        data.executionClient,
        data.consensusClient,
        data.slot ?? null,
        data.liveness ?? null,
        data.blockProposalStatus ?? null,
        data.syncCommitteeRewards ?? null,
        JSON.stringify(data.attestationsRewards) ?? null, // JSONB expects a string
        data.error ?? null
      ]);
    } catch (err) {
      logger.error("Error inserting data:", err);
      // TODO: what to do if insert fails?
    }
  }

  /**
   * Get the validators data for the given validator indexes from all epochs.
   *
   * @param validatorIndexes - The indexes of the validators to get the data for.
   * @returns The performance data for the given validators.
   */
  public async getValidatorsDataFromAllEpochs(validatorIndexes: string[]): Promise<ValidatorPerformance[]> {
    const query = `
SELECT * FROM ${this.tableName}
WHERE ${Columns.validatorIndex} = ANY($1)
    `;
    try {
      const result = await this.sql.unsafe(query, [validatorIndexes]);
      // TODO: add type for result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.map((row: any) => ({
        validatorIndex: row.validator_index,
        epoch: row.epoch,
        executionClient: row.execution_client,
        consensusClient: row.consensus_client,
        slot: row.slot,
        liveness: row.liveness,
        blockProposalStatus: row.block_proposal_status,
        syncCommitteeRewards: row.sync_comittee_rewards,
        attestationsRewards: row.attestations_rewards,
        error: row.error
      }));
    } catch (err) {
      logger.error("Error getting data:", err);
      return [];
    }
  }

  /**
   * Method to close the database connection.
   */
  public async close(): Promise<void> {
    try {
      await this.sql.end();
      logger.info("Database connection closed.");
    } catch (err) {
      logger.error("Error closing the database connection:", err);
    }
  }
}

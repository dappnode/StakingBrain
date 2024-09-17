import postgres from "postgres";
import logger from "../../logger/index.js";
import { BlockProposalStatus, ValidatorPerformance } from "./types.js";

export class PostgresClient {
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
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_proposal_status') THEN
        CREATE TYPE block_proposal_status AS ENUM('${BlockProposalStatus.Missed}', '${BlockProposalStatus.Proposed}', '${BlockProposalStatus.Unchosen}');
      END IF;
    END $$;
        
    CREATE TABLE IF NOT EXISTS validators_performance (
      validator_index BIGINT NOT NULL,
      epoch BIGINT NOT NULL,
      slot BIGINT NOT NULL,
      liveness BOOLEAN,
      block_proposal_status block_proposal_status,
      sync_comittee_rewards BIGINT,
      attestations_rewards JSONB,
      error TEXT,
      PRIMARY KEY (validator_index, epoch)
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
   * Inserts the given performance data into the database.
   *
   * @param data - The performance data to insert.
   * @example insertPerformanceData({ validatorIndex: 1, epoch: 1, slot: 1, liveness: true, blockProposalStatus: "missed", syncCommitteeRewards: 100, attestationsRewards: { attestation1: 10, attestation2: 20 } })
   */
  public async insertPerformanceData(data: ValidatorPerformance): Promise<void> {
    const query = `
INSERT INTO validator_performance (validator_index, epoch, slot, liveness, block_proposal_status, sync_comittee_rewards, attestations_rewards, error)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    try {
      await this.sql.unsafe(query, [
        data.validatorIndex,
        data.epoch,
        data.slot,
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

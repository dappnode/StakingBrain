import postgres from "postgres";
import logger from "../../logger/index.js";
import { BlockProposalStatus, ValidatorPerformance } from "./types.js";
import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";

// Postgres has a built in class for errors PostgresError. i.e:
// PostgresError: type "block_proposal_status" already exists
//     at ErrorResponse (file:///app/node_modules/postgres/src/connection.js:788:26)
//     at handle (file:///app/node_modules/postgres/src/connection.js:474:6)
//     at Socket.data (file:///app/node_modules/postgres/src/connection.js:315:9)
//     at Socket.emit (node:events:519:28)
//     at addChunk (node:internal/streams/readable:559:12)
//     at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
//     at Readable.push (node:internal/streams/readable:390:5)
//     at TCP.onStreamRead (node:internal/stream_base_commons:191:23) {
//   severity_local: 'ERROR',
//   severity: 'ERROR',
//   code: '42710',
//   where: `SQL statement "CREATE TYPE BLOCK_PROPOSAL_STATUS AS ENUM('Missed', 'Proposed', 'Unchosen')"\n` +
//     'PL/pgSQL function inline_code_block line 5 at SQL statement',
//   file: 'typecmds.c',
//   line: '1170',
//   routine: 'DefineEnum'
// }

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
  private readonly BLOCK_PROPOSAL_STATUS = "BLOCK_PROPOSAL_STATUS";
  private readonly EXECUTION_CLIENT = "EXECUTION_CLIENT";
  private readonly CONSENSUS_CLIENT = "CONSENSUS_CLIENT";
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

    const result = await this.sql.unsafe(query);
    return result[0].pg_total_relation_size;
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
    // important: enum create types must be broken into separate conditional checks for each ENUM type before trying to create it.
    // Check and create BLOCK_PROPOSAL_STATUS ENUM type if not exists
    await this.sql.unsafe(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${this.BLOCK_PROPOSAL_STATUS}') THEN
        CREATE TYPE ${this.BLOCK_PROPOSAL_STATUS} AS ENUM('${BlockProposalStatus.Missed}', '${BlockProposalStatus.Proposed}', '${BlockProposalStatus.Unchosen}');
      END IF;
    END $$;
  `);

    // Check and create EXECUTION_CLIENT ENUM type if not exists
    await this.sql.unsafe(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${this.EXECUTION_CLIENT}') THEN
        CREATE TYPE ${this.CONSENSUS_CLIENT} AS ENUM('${ExecutionClient.Besu}', '${ExecutionClient.Nethermind}', '${ExecutionClient.Geth}', '${ExecutionClient.Erigon}', '${ExecutionClient.Unknown}');
      END IF;
    END $$;
  `);

    // Check and create CONSENSUS_CLIENT ENUM type if not exists
    await this.sql.unsafe(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${this.CONSENSUS_CLIENT}') THEN
        CREATE TYPE ${this.CONSENSUS_CLIENT} AS ENUM('${ConsensusClient.Teku}', '${ConsensusClient.Prysm}', '${ConsensusClient.Lighthouse}', '${ConsensusClient.Nimbus}', '${ConsensusClient.Unknown}');
      END IF;
    END $$;
  `);

    const query = `
-- Create the table if not exists
CREATE TABLE IF NOT EXISTS ${this.tableName} (
  ${Columns.validatorIndex} BIGINT NOT NULL,
  ${Columns.epoch} BIGINT NOT NULL,
  ${Columns.executionClient} ${this.EXECUTION_CLIENT} NOT NULL,
  ${Columns.consensusClient} ${this.CONSENSUS_CLIENT} NOT NULL,
  ${Columns.slot} BIGINT,
  ${Columns.liveness} BOOLEAN,
  ${Columns.blockProposalStatus} ${this.BLOCK_PROPOSAL_STATUS},
  ${Columns.syncCommitteeRewards} BIGINT,
  ${Columns.attestationsRewards} JSONB,
  ${Columns.error} TEXT,
  PRIMARY KEY (${Columns.validatorIndex}, ${Columns.epoch})
);
`;
    await this.sql.unsafe(query);
    logger.info("Table created or already exists.");
  }

  /**
   * Delete database table and its enum types.
   */
  public async deleteDatabaseTableAndEnumTypes() {
    await this.sql.unsafe(`DROP TABLE IF EXISTS ${this.tableName}`);
    await this.sql.unsafe(`
    DROP TYPE IF EXISTS BLOCK_PROPOSAL_STATUS;
    DROP TYPE IF EXISTS EXECUTION_CLIENT;
    DROP TYPE IF EXISTS CONSENSUS_CLIENT;
  `);
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
  }

  /**
   * Method to close the database connection.
   */
  public async close(): Promise<void> {
    await this.sql.end();
    logger.info("Database connection closed.");
  }
}

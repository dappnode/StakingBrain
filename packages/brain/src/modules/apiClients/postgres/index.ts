import postgres from "postgres";
import logger from "../../logger/index.js";
import { BlockProposalStatus, Columns, EpochData, ValidatorPerformancePostgres } from "./types.js";
import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";
import { EpochsValidatorsMap, DataPerEpoch, ValidatorsEpochMap } from "../../validatorsDataIngest/types.js";

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
   * Initializes the database by creating the required table if it does not exist with the required columns.
   */
  public async initialize() {
    // important: enum create types must be broken into separate conditional checks for each ENUM type before trying to create it.
    // Check and create BLOCK_PROPOSAL_STATUS ENUM type if not exists
    await this.sql.unsafe(`
    DO $$
    BEGIN
      CREATE TYPE ${this.BLOCK_PROPOSAL_STATUS} AS ENUM('${BlockProposalStatus.Missed}', '${BlockProposalStatus.Proposed}', '${BlockProposalStatus.Unchosen}');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
  `);
    // Check and create EXECUTION_CLIENT ENUM type if not exists
    await this.sql.unsafe(`
    DO $$
    BEGIN
        CREATE TYPE ${this.EXECUTION_CLIENT} AS ENUM('${ExecutionClient.Besu}', '${ExecutionClient.Nethermind}', '${ExecutionClient.Geth}', '${ExecutionClient.Reth}', '${ExecutionClient.Erigon}', '${ExecutionClient.Unknown}');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
  `);

    // Check and create CONSENSUS_CLIENT ENUM type if not exists
    await this.sql.unsafe(`
    DO $$
    BEGIN
        CREATE TYPE ${this.CONSENSUS_CLIENT} AS ENUM('${ConsensusClient.Teku}', '${ConsensusClient.Lodestar}', '${ConsensusClient.Prysm}', '${ConsensusClient.Lighthouse}', '${ConsensusClient.Nimbus}', '${ConsensusClient.Unknown}');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
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
  ${Columns.attestationsTotalRewards} JSONB,
  ${Columns.attestationsIdealRewards} JSONB,
  ${Columns.error} JSONB NULL,
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
    DROP TYPE IF EXISTS ${this.BLOCK_PROPOSAL_STATUS};
    DROP TYPE IF EXISTS ${this.EXECUTION_CLIENT};
    DROP TYPE IF EXISTS ${this.CONSENSUS_CLIENT};
  `);
  }

  /**
   * Inserts the given performance data into the database. If the data already exists for the given validator index and epoch,
   *
   * IMPORTANT: it must be noted that the query will update if the data already exists for the given validator index and epoch.
   * If the data exists without an error and the new data has an error, the error will be updated and the other fields will remain the same.
   *
   * @param data - The performance data to insert.
   */
  public async insertPerformanceData(data: EpochData): Promise<void> {
    const query = `
INSERT INTO ${this.tableName} (${Columns.validatorIndex}, ${Columns.epoch}, ${Columns.executionClient}, ${Columns.consensusClient}, ${Columns.slot}, ${Columns.liveness}, ${Columns.blockProposalStatus}, ${Columns.syncCommitteeRewards}, ${Columns.attestationsTotalRewards}, ${Columns.attestationsIdealRewards}, ${Columns.error})
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (${Columns.validatorIndex}, ${Columns.epoch})
DO UPDATE SET
  ${Columns.executionClient} = EXCLUDED.${Columns.executionClient},
  ${Columns.consensusClient} = EXCLUDED.${Columns.consensusClient},
  ${Columns.slot} = EXCLUDED.${Columns.slot},
  ${Columns.liveness} = EXCLUDED.${Columns.liveness},
  ${Columns.blockProposalStatus} = EXCLUDED.${Columns.blockProposalStatus},
  ${Columns.syncCommitteeRewards} = EXCLUDED.${Columns.syncCommitteeRewards},
  ${Columns.attestationsTotalRewards} = EXCLUDED.${Columns.attestationsTotalRewards},
  ${Columns.attestationsIdealRewards} = EXCLUDED.${Columns.attestationsIdealRewards},
  ${Columns.error} = EXCLUDED.${Columns.error};
    `;

    // Execute the query with the appropriate parameters
    await this.sql.unsafe(query, [
      data.validatorIndex,
      data.epoch,
      data.executionClient,
      data.consensusClient,
      data.slot ?? null,
      data.liveness ?? null,
      data.blockProposalStatus ?? null,
      data.syncCommitteeRewards ?? null,
      data.attestationsTotalRewards ? JSON.stringify(data.attestationsTotalRewards) : null, // JSONB expects a string or null
      data.attestationsIdealRewards ? JSON.stringify(data.attestationsIdealRewards) : null, // JSONB expects a string or null
      data.error ? JSON.stringify(data.error) : null // JSONB expects a string or null
    ]);
  }

  /**
   * Get the validators data for the given validator indexes from all epochs. In order to improve data process
   * it will return a map with the validator index as key and the performance data as value.
   *
   * @param validatorIndexes - The indexes of the validators to get the data for.
   * @returns The performance data for the given validators.
   */
  public async getValidatorsDataFromAllEpochs(validatorIndexes: string[]): Promise<EpochData[]> {
    const query = `
SELECT * FROM ${this.tableName}
WHERE ${Columns.validatorIndex} = ANY($1)
    `;

    const result = (await this.sql.unsafe(query, [validatorIndexes])) as ValidatorPerformancePostgres[];
    return result.map((row: ValidatorPerformancePostgres) => ({
      validatorIndex: row.validator_index,
      epoch: row.epoch,
      executionClient: row.execution_client,
      consensusClient: row.consensus_client,
      slot: row.slot,
      liveness: row.liveness,
      blockProposalStatus: row.block_proposal_status,
      syncCommitteeRewards: row.sync_comittee_rewards,
      attestationsTotalRewards: JSON.parse(row.attestations_total_rewards),
      attestationsIdealRewards: JSON.parse(row.attestations_ideal_rewards),
      error: JSON.parse(row.error)
    }));
  }

  /**
   * Get the validators data for the given validator indexes and an epoch start and end range.
   * This function will return a nested map where the outer map is indexed by epoch, and
   * each entry contains another map indexed by validator index. The inner map contains the performance data
   * for each validator at that epoch.
   *
   * The performance data returned will be organized into attestation, block, and sync committee
   * sections to provide a more structured view of the data per epoch.
   *
   * @param validatorIndexes - The indexes of the validators to get the data for.
   * @param startEpoch - The start epoch number.
   * @param endEpoch - The end epoch number.
   * @returns A nested map with epoch as the key, validator index as the secondary key, and the performance data as value.
   */
  public async getEpochsDataMapForEpochRange({
    validatorIndexes,
    startEpoch,
    endEpoch
  }: {
    validatorIndexes: string[];
    startEpoch: number;
    endEpoch: number;
  }): Promise<EpochsValidatorsMap> {
    const query = `
SELECT * FROM ${this.tableName}
WHERE ${Columns.validatorIndex} = ANY($1)
AND ${Columns.epoch} >= $2
AND ${Columns.epoch} <= $3
    `;

    const result = (await this.sql.unsafe(query, [
      validatorIndexes,
      startEpoch,
      endEpoch
    ])) as ValidatorPerformancePostgres[];

    return result.reduce((map: EpochsValidatorsMap, row) => {
      const epoch = row.epoch;
      const validatorIndex = row.validator_index;

      // Define the performance data in the new format.
      const epochData: DataPerEpoch = {
        attestation: {
          totalRewards: JSON.parse(row.attestations_total_rewards),
          idealRewards: JSON.parse(row.attestations_ideal_rewards)
        },
        block: {
          status: row.block_proposal_status, // Assuming row.block_proposal_status will provide either 'proposed' or 'missed'
          slot: row.slot,
          graffiti: undefined, // Assuming there's no graffiti info in the existing data
          reward: undefined // Assuming there's no reward info in the existing data
        },
        syncCommittee: {
          reward: row.sync_comittee_rewards
        },
        tag: "solo" // TODO fix this
      };

      // If the outer map doesn't have the epoch, add it.
      if (!map.has(epoch)) map.set(epoch, new Map<number, DataPerEpoch>());

      const validatorsEpochMap = map.get(epoch);
      // Add or update the validator data for this epoch.
      if (validatorsEpochMap) validatorsEpochMap.set(validatorIndex, epochData);

      return map;
    }, new Map<number, ValidatorsEpochMap>());
  }

  /**
   * Method to close the database connection.
   */
  public async close(): Promise<void> {
    await this.sql.end();
    logger.info("Database connection closed.");
  }
}

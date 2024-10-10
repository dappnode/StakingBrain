import postgres from "postgres";
import logger from "../../logger/index.js";
import { EpochsValidatorsMap, DataPerEpoch, Columns, ValidatorsDataPerEpochMap } from "./types.js";

export class PostgresClient {
  private readonly tableName = "epochs_data";
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
   * Initialize the database table if it doesn't exist.
   */
  public async initialize() {
    const query = `
-- Create the table if not exists
CREATE TABLE IF NOT EXISTS ${this.tableName} (
  ${Columns.validatorIndex} BIGINT NOT NULL, 
  ${Columns.epoch} BIGINT NOT NULL,
  ${Columns.clients} JSONB NOT NULL,
  ${Columns.attestation} JSONB,
  ${Columns.block} JSONB,
  ${Columns.syncCommittee} JSONB,
  ${Columns.slot} BIGINT NULL,
  ${Columns.error} JSONB NULL,
  PRIMARY KEY (validatorIndex, epoch)
);
`;
    await this.sql.unsafe(query);
    logger.info("Table created or already exists.");
  }

  /**
   * Delete database table.
   */
  public async deleteDatabaseTable() {
    await this.sql.unsafe(`DROP TABLE IF EXISTS ${this.tableName}`);
  }

  /**
   * Inserts epoch data into the database. If the data already exists for the given validator index and epoch it will be updated.
   */
  public async insertValidatorDataPerEpoch(
    epoch: number,
    validatorsDataPerEpochMap: ValidatorsDataPerEpochMap
  ): Promise<void> {
    const query = `
INSERT INTO ${this.tableName} (${Columns.validatorIndex}, ${Columns.epoch}, ${Columns.clients}, ${Columns.attestation}, ${Columns.block}, ${Columns.syncCommittee}, ${Columns.slot}, ${Columns.error})
VALUES ${Array.from(validatorsDataPerEpochMap.entries())
      .map(([validatorIndex, data]) => {
        return `(${validatorIndex}, ${epoch}, '${JSON.stringify(data.clients)}', '${JSON.stringify(data.attestation) || null}', '${JSON.stringify(data.block) || null}', '${JSON.stringify(data.syncCommittee) || null}', ${data.slot || null}, '${JSON.stringify(data.error) || null}')`;
      })
      .join(", ")}
ON CONFLICT (${Columns.validatorIndex}, ${Columns.epoch})
DO UPDATE SET
${Columns.clients} = EXCLUDED.${Columns.clients},
${Columns.attestation} = EXCLUDED.${Columns.attestation},
${Columns.block} = EXCLUDED.${Columns.block},
${Columns.syncCommittee} = EXCLUDED.${Columns.syncCommittee},
${Columns.slot} = EXCLUDED.${Columns.slot},
${Columns.error} = EXCLUDED.${Columns.error}
    `;

    await this.sql.unsafe(query);
  }

  /**
   * Get the epoch data for the given validator indexes and epoch range.
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

    const result = await this.sql.unsafe(query, [validatorIndexes, startEpoch, endEpoch]);

    const epochsValidatorsMap: EpochsValidatorsMap = new Map();

    for (const row of result) {
      const epoch = row[Columns.epoch];
      const validatorIndex = row[Columns.validatorIndex];
      const data: DataPerEpoch = {
        clients: JSON.parse(row[Columns.clients]),
        attestation: JSON.parse(row[Columns.attestation]),
        block: JSON.parse(row[Columns.block]),
        syncCommittee: JSON.parse(row[Columns.syncCommittee]),
        slot: row[Columns.slot],
        error: JSON.parse(row[Columns.error])
      };

      if (!epochsValidatorsMap.has(epoch)) epochsValidatorsMap.set(epoch, new Map());

      epochsValidatorsMap.get(epoch)!.set(validatorIndex, data);
    }

    return epochsValidatorsMap;
  }

  /**
   * Close the database connection.
   */
  public async close(): Promise<void> {
    await this.sql.end();
    logger.info("Database connection closed.");
  }
}

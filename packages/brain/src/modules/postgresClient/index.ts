import postgres from "postgres";
import logger from "../logger/index.js";

export class PostgresClient {
  private sql;

  /**
   * Initialize the client with the given database URL.
   *
   * @param dbUrl - The URL of the database to connect to. It must contain the username, password, host, port, and database name.
   * @example "postgres://username:password@localhost:5432/database"
   */
  constructor(dbUrl: string) {
    this.sql = postgres(dbUrl, {
      ssl: false // Enable SSL if required
    });
  }

  // Initialize method to create the validator_performance table
  async initialize() {
    const query = `
      CREATE TABLE IF NOT EXISTS validator_performance (
        validator_index BIGINT NOT NULL,
        epoch_slot BIGINT NOT NULL,
        attestation_status BOOLEAN NOT NULL,
        inclusion_distance BIGINT NOT NULL,
        PRIMARY KEY (validator_index, epoch_slot)
      );
    `;
    try {
      await this.sql.unsafe(query);
      logger.info("Table created or already exists.");
    } catch (err) {
      logger.error("Error creating table:", err);
    }
  }

  // Method to insert or update an attestation status record
  async insertAttestationStatus(
    validatorIndex: number,
    epochSlot: number,
    attestationStatus: boolean,
    inclusionDistance: number
  ) {
    try {
      await this.sql`
        INSERT INTO validator_performance 
          (validator_index, epoch_slot, attestation_status, inclusion_distance)
        VALUES 
          (${validatorIndex}, ${epochSlot}, ${attestationStatus}, ${inclusionDistance})
        ON CONFLICT (validator_index, epoch_slot)
        DO UPDATE SET 
          attestation_status = ${attestationStatus}, 
          inclusion_distance = ${inclusionDistance};
      `;
      logger.info("Attestation status inserted/updated successfully.");
    } catch (err) {
      logger.error("Error inserting/updating attestation status:", err);
    }
  }

  // Method to fetch attestation status by validator index and epoch slot
  async getAttestationStatus(validatorIndex: number, epochSlot: number) {
    try {
      const result = await this.sql`
        SELECT * FROM validator_performance 
        WHERE validator_index = ${validatorIndex} 
        AND epoch_slot = ${epochSlot}
      `;
      if (result.count > 0) {
        return result[0];
      } else {
        logger.info("No record found.");
        return null;
      }
    } catch (err) {
      logger.error("Error fetching attestation status:", err);
      return null;
    }
  }

  // Method to get all attestations for a specific validator
  async getAttestationsByValidator(validatorIndex: number) {
    try {
      const result = await this.sql`
        SELECT * FROM validator_performance 
        WHERE validator_index = ${validatorIndex}
        ORDER BY epoch_slot DESC
      `;
      return result;
    } catch (err) {
      logger.error("Error fetching attestations by validator:", err);
      return [];
    }
  }

  // Close the connection
  async close() {
    try {
      await this.sql.end();
      logger.info("Database connection closed.");
    } catch (err) {
      logger.error("Error closing the database connection:", err);
    }
  }
}

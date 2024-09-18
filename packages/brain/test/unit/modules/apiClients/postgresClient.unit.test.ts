import { PostgresClient } from "../../../../src/modules/apiClients/index.js";
import { describe, it } from "node:test";

// This test must be executed with a real database connection

describe.skip("Postgres client", function () {
  this.timeout(10 * 1000);
  // change the dbUrl on demmand
  const dbUrl = "postgres://postgres:password@postgres.web3signer-holesky.dappnode:5432/web3signer";
  const postgresClient = new PostgresClient(dbUrl);

  it("should initialize the database", async () => {
    await postgresClient.initialize();
  });

  it("should get table size", async () => {
    const tableSize = await postgresClient.getTableSize();
    console.log("Table size: ", tableSize);
  });

  it("should delete the table", async () => {
    await postgresClient.deleteDatabaseTable();
  });
});

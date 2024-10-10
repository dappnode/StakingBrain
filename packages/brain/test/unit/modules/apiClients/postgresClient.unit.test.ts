import { PostgresClient } from "../../../../src/modules/apiClients/index.js";

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

  it("should get validators data from the db", async () => {
    const validatorIndexes = ["1802289", "1802258"];
    const data = await postgresClient.getValidatorsDataFromAllEpochs(validatorIndexes);
    console.log("Validators data: ", data);
  });

  it("should delete the table and its enum types", async () => {
    await postgresClient.deleteDatabaseTable();
  });
});

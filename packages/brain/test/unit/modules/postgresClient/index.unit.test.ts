import { PostgresClient } from "../../../../src/modules/postgresClient/index.js";

// This test must be executed with a real database connection

describe.skip("Postgres client", function () {
  this.timeout(10 * 1000);
  it("should initialize the database", async () => {
    // change the dbUrl on demmand
    const dbUrl = "postgres://postgres:password@postgres.web3signer-holesky.dappnode:5432/web3signer";
    const postgresClient = new PostgresClient(dbUrl);
    await postgresClient.initialize();
  });
});

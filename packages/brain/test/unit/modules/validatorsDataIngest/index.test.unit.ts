import { PostgresClient } from "../../../../src/modules/apiClients/index.js";
import { fetchAndProcessValidatorsData } from "../../../../src/modules/validatorsDataIngest/index.js";

// This test must be executed with a real database connection

describe("Validators data ingest", function () {
  this.timeout(10 * 1000);
  // change the dbUrl on demmand
  const dbUrl = "postgres://postgres:password@postgres.web3signer-holesky.dappnode:5432/web3signer";
  const postgresClient = new PostgresClient(dbUrl);

  it("should fetch and process validators data", async () => {});
});

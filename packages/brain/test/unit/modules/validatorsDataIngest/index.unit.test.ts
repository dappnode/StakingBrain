import { PostgresClient } from "../../../../src/modules/apiClients/index.js";
import { fetchAndProcessValidatorsData } from "../../../../src/modules/validatorsDataIngest/index.js";
import { Granularity } from "../../../../src/modules/validatorsDataIngest/types.js";

// This test must be executed with a real database connection

describe.skip("Validators data ingest", function () {
  this.timeout(10 * 1000);
  // change the dbUrl on demmand
  const dbUrl = "postgres://postgres:password@postgres.web3signer-holesky.dappnode:5432/web3signer";
  const postgresClient = new PostgresClient(dbUrl);

  it("should fetch and process validators data", async () => {
    const validatorIndexes = ["1802289", "1802258"];
    const minGenesisTime = 1695902100;
    const secondsPerSlot = 12;

    const data = await fetchAndProcessValidatorsData({
      validatorIndexes,
      postgresClient,
      minGenesisTime,
      secondsPerSlot,
      numberOfDaysToQuery: 1,
      granularity: Granularity.Hourly
    });

    console.log(data);
  });
});

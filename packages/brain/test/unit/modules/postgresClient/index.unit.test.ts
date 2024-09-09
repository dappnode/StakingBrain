import { expect } from "chai";
import { ValidatorApi, Web3SignerApi } from "../../../../src/modules/apiClients/index.js";
import { Beaconchain } from "../../../../src/modules/apiClients/beaconchain.js";
import { PostgresClient } from "../../../../src/modules/postgresClient/index.js";

// This test must be executed with a real database connection
// skip in CI

describe.only("Postgres client", function () {
  this.timeout(10 * 1000);
  const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg";
  const network = "holesky";
  const validatorApi = new ValidatorApi(
    {
      baseUrl: "http://validator.holesky.dncore.dappnode:3500",
      authToken
    },
    network
  );
  const beaconchainApi = new Beaconchain({ baseUrl: "http://beacon-chain.holesky.dncore.dappnode:3500" }, network);
  const signerApi = new Web3SignerApi(
    {
      baseUrl: "http://signer.holesky.dncore.dappnode:9000",
      authToken,
      host: "brain.web3signer-holesky.dappnode"
    },
    network
  );

  it("should initialize the database", async () => {
    // change the dbUrl on demmand
    const dbUrl = "postgres://postgres:password@postgres.web3signer-holesky.dappnode:5432/web3signer";
    const postgresClient = new PostgresClient(dbUrl);
    await postgresClient.initialize();
  });

  it("should get validator liveness", async () => {
    const pubkeys = (await signerApi.listRemoteKeys()).data.map((key) => key.validating_pubkey);
    console.log(`Pubkeys: ${pubkeys}`);
    const indexes = await Promise.all(
      pubkeys.map(async (pubkey) => (await beaconchainApi.getStateValidator({ state: "head", pubkey })).data.index)
    );
    console.log(`Indexes: ${indexes}`);
    const headEpochMinusOne = (await beaconchainApi.getEpochHeader("head")) - 1;
    console.log(`Head epoch: ${headEpochMinusOne}`);
    const liveness = await beaconchainApi.getLiveness(headEpochMinusOne.toString(), indexes);

    // print liveness
    console.log(liveness);
  });
});

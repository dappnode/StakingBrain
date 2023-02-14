import { expect } from "chai";
import { before } from "mocha";
import { ValidatorApi } from "../../../../src/modules/apiClients/validator/index.js";
import { execSync } from "node:child_process";
import { Web3SignerApi } from "../../../../src/modules/apiClients/web3signer/index.js";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import fs from "fs";
import path from "path";

describe.only("Cron: Prater", () => {
  const defaultFeeRecipient = "0x0000000000000000000000000000000000000000";

  //The order of this array is important for the tests
  const pubkeys = [
    "0xa2cc280ce811bb680cba309103e23dc3c9902f2a08541c6737e8adfe8198e796023b959fc8aadfad39499b56ec3dd184",
    "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7",
    "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a",
    "0x8f2b698583d69c7a78b4482871282602adb7fb47a1aab66c63feb48e7b9245dad77b82346e0201328d66a8b4d483b716",
    "0xa1735a0dd72205dae313c36d7d17f5b06685944c8886ddac530e5aedbe1fca0c8003e7e274ec1b4ddd08b884f5b9a830",
  ];

  const keystoresPath = path.resolve(process.cwd(), "keystores");

  const keystorePass = "stakingbrain";

  const stakerSpecs = {
    network: "prater",
    consensusClients: [
      {
        name: "Prysm",
        containerName:
          "DAppNodePackage-validator.prysm-prater.dnp.dappnode.eth",
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg",
      },
      /**{
        name: "Lighthouse",
        containerName:
          "DAppNodePackage-validator.lighthouse-prater.dnp.dappnode.eth",
        token:
          "api-token-0x0200e6ce18e26fd38caca7ae1bfb9e2bba7efb20ed2746ad17f2f6dda44603152d",
      },
      {
        name: "Nimbus",
        containerName:
          "DAppNodePackage-beacon-validator.nimbus-prater.dnp.dappnode.eth",
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg",
      },
      {
        name: "Teku",
        containerName: "DAppNodePackage-validator.teku-prater.dnp.dappnode.eth",
        token: "cd4892ca35d2f5d3e2301a65fc7aa660",
      },*/
    ],
  };

  for (const consensusClient of stakerSpecs.consensusClients) {
    describe(`Consensus client: ${consensusClient.name}`, () => {
      let validatorApi: ValidatorApi;
      let signerApi: Web3SignerApi;
      let brainDb: BrainDataBase;

      const testDbName = "testDb.json";

      const signerContainerName =
        "DAppNodePackage-web3signer.web3signer-prater.dnp.dappnode.eth";

      const host = "web3signer.web3signer-prater.dappnode";

      before(() => {
        const consensusIp = execSync(
          `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${consensusClient.containerName}`
        )
          .toString()
          .trim();
        validatorApi = new ValidatorApi({
          baseUrl: `http://${consensusIp}:3500`,
          authToken: consensusClient.token,
        });

        const signerIp = execSync(
          `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${signerContainerName}`
        )
          .toString()
          .trim();
        signerApi = new Web3SignerApi({
          baseUrl: `http://${signerIp}:9000`,
          host,
        });

        if (fs.existsSync(testDbName)) fs.unlinkSync(testDbName);
        brainDb = new BrainDataBase(testDbName);
      });

      beforeEach(async () => {
        //Clean DB
        fs.writeFileSync(testDbName, JSON.stringify({}));

        //Clean validator
        await validatorApi.deleteRemoteKeys({ pubkeys });

        //Clean signer
        await signerApi.deleteKeystores({ pubkeys });
      });

      it("Should post fee recipient in DB to validator", async () => {
        //TODO
        await addValidatorsToAllSources(1);
      }).timeout(10000);

      //Auxiliary function (not a test)
      async function addValidatorsToAllSources(nValidators = 5) {
        if (nValidators > pubkeys.length) nValidators = pubkeys.length;

        if (nValidators < 1) nValidators = 1;

        //Add keystores to signer
        const keystoresPaths = fs
          .readdirSync(keystoresPath)
          .filter((file) => file.endsWith(".json"));

        //Reduce keystoresPaths to nValidators
        keystoresPaths.splice(nValidators);

        const keystores = keystoresPaths.map((file) =>
          fs.readFileSync(path.join(keystoresPath, file)).toString()
        );

        const passwords = Array(keystores.length).fill("stakingbrain");

        await signerApi.importKeystores({
          keystores,
          passwords,
        });

        //Add validator to DB
        const pubkeysToTest = pubkeys.slice(0, nValidators);

        brainDb.addValidators({
          pubkeys: pubkeysToTest,
          tags: Array(pubkeysToTest.length).fill("solo"),
          feeRecipients: Array(pubkeysToTest.length).fill(defaultFeeRecipient),
          automaticImports: Array(pubkeysToTest.length).fill(true),
        });

        //Add pubkeys to validator
        const signerUrl = signerApi.getBaseUrl();

        await validatorApi.postRemoteKeys({
          remote_keys: pubkeysToTest.map((pubkey) => ({
            pubkey,
            url: signerUrl,
          })),
        });

      }
    });
  }
});

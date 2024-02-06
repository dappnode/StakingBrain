import { expect } from "chai";
import { before } from "mocha";
import { ValidatorApi } from "../../../../src/modules/apiClients/validator/index.js";
import { execSync } from "node:child_process";
import { Web3SignerApi } from "../../../../src/modules/apiClients/web3signer/index.js";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import fs from "fs";
import path from "path";
import { Cron } from "../../../../src/modules/cron/index.js";
import { Network, PubkeyDetails } from "@stakingbrain/common";

describe.skip("Cron: Prater", () => {
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
    network: "prater" as Network,
    consensusClients: [
      /*{
        name: "Prysm",
        containerName:
          "DAppNodePackage-validator.prysm-prater.dnp.dappnode.eth",
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg",
      },*/
      {
        name: "Lighthouse",
        containerName:
          "DAppNodePackage-validator.lighthouse-prater.dnp.dappnode.eth",
        token:
          "api-token-0x0200e6ce18e26fd38caca7ae1bfb9e2bba7efb20ed2746ad17f2f6dda44603152d",
      },
      /*{
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
      let cron: Cron;

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
        }, stakerSpecs.network);

        const signerIp = execSync(
          `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${signerContainerName}`
        )
          .toString()
          .trim();
        signerApi = new Web3SignerApi({
          baseUrl: `http://${signerIp}:9000`,
          host,
        }, stakerSpecs.network);

        if (fs.existsSync(testDbName)) fs.unlinkSync(testDbName);
        brainDb = new BrainDataBase(testDbName);

        cron = new Cron(
          60 * 1000,
          signerApi,
          `http://${signerIp}:9000`,
          validatorApi,
          brainDb
        );
      });

      beforeEach(async function () {
        this.timeout(40000);

        console.log("Cleaning DB, validator and signer");

        //Clean DB
        fs.writeFileSync(testDbName, JSON.stringify({}));

        //Clean validator
        await validatorApi.deleteRemoteKeys({ pubkeys });

        //Clean signer
        await signerApi.deleteKeystores({ pubkeys });
      });

      it("Should post fee recipient in DB to validator", async () => {
        await addSampleValidatorsToAllSources(1);

        const pubkeyToTest = pubkeys[0];

        const feeRecipient = "0x1111111111111111111111111111111111111111";

        brainDb.updateValidators({
          validators: {
            [pubkeyToTest]: {
              feeRecipient,
            },
          },
        });

        //Check that fee recipient has changed in validator
        await cron.reloadValidators();

        const validatorFeeRecipient = await validatorApi.getFeeRecipient(
          pubkeyToTest
        );

        expect(validatorFeeRecipient.data.ethaddress).to.be.equal(feeRecipient);
        expect(validatorFeeRecipient.data.ethaddress).to.be.equal(feeRecipient);
      }).timeout(15000);

      it("Should remove 1 keystore from signer to match pubkeys in DB", async () => {
        addSampleValidatorsToDB(1);
        await addSampleKeystoresToSigner(2);

        await cron.reloadValidators();

        const signerPubkeys = await signerApi.getKeystores();
        const dbPubkeys = Object.keys(brainDb.getData());

        expect(signerPubkeys.data.length).to.be.equal(1);
        expect(dbPubkeys.length).to.be.equal(1);

        expect(signerPubkeys.data[0].validating_pubkey).to.be.equal(
          dbPubkeys[0]
        );
      }).timeout(15000);

      it("Should remove 1 keystore from DB to match keystores in signer", async () => {
        addSampleValidatorsToDB(2);
        await addSampleKeystoresToSigner(1);

        await cron.reloadValidators();

        const signerPubkeys = await signerApi.getKeystores();
        const dbPubkeys = Object.keys(brainDb.getData());

        expect(signerPubkeys.data.length).to.be.equal(1);
        expect(dbPubkeys.length).to.be.equal(1);

        expect(signerPubkeys.data[0].validating_pubkey).to.be.equal(
          dbPubkeys[0]
        );
      }).timeout(15000);

      it("Should remove all the pubkeys in DB and keystores in signer to match each other", async () => {
        addSampleValidatorsToDB(2);
        await addSampleKeystoresToSigner(2);

        brainDb.deleteValidators([pubkeys[0]]);
        await signerApi.deleteKeystores({ pubkeys: [pubkeys[1]] });

        await cron.reloadValidators();

        const signerPubkeys = await signerApi.getKeystores();
        const dbPubkeys = Object.keys(brainDb.getData());

        expect(signerPubkeys.data.length).to.be.equal(0);
        expect(dbPubkeys.length).to.be.equal(0);
      }).timeout(15000);

      it("Should keep all the keystores in the signer and the pubkeys in the DB", async () => {
        addSampleValidatorsToDB(2);
        await addSampleKeystoresToSigner(2);

        await cron.reloadValidators();

        const signerPubkeys = await signerApi.getKeystores();
        const dbPubkeys = Object.keys(brainDb.getData());

        expect(signerPubkeys.data.length).to.be.equal(2);
        expect(dbPubkeys.length).to.be.equal(2);

        //Expect the same pubkeys in both sources (could not be in the same order)
        expect(signerPubkeys.data[0].validating_pubkey).to.be.oneOf(dbPubkeys);
        expect(signerPubkeys.data[1].validating_pubkey).to.be.oneOf(dbPubkeys);
      }).timeout(15000);

      it("Should delete all pubkeys from validator with empty DB", async () => {
        await addSamplePubkeysToValidator(1);

        console.log("Added pubkeys to validator");

        await cron.reloadValidators();

        console.log("Validators reloaded");

        const validatorPubkeys = await validatorApi.getRemoteKeys();

        console.log("Got validator pubkeys");

        expect(validatorPubkeys.data.length).to.be.equal(0);
      }).timeout(50000);

      it("Should add the pubkeys in the DB to the validator", async () => {
        addSampleValidatorsToDB(2);
        await addSampleKeystoresToSigner(2);

        const pubkeysToTest = pubkeys.slice(0, 2);

        await cron.reloadValidators();

        const validatorPubkeys = await validatorApi.getRemoteKeys();

        expect(validatorPubkeys.data.length).to.be.equal(2);

        //Expect the same pubkeys in both sources (could not be in the same order)
        expect(validatorPubkeys.data[0].pubkey).to.be.oneOf(pubkeysToTest);
        expect(validatorPubkeys.data[1].pubkey).to.be.oneOf(pubkeysToTest);
      }).timeout(15000);

      // AUXILIARY FUNCTIONS //

      async function addSampleValidatorsToAllSources(nValidators = 5) {
        if (nValidators > pubkeys.length) nValidators = pubkeys.length;

        if (nValidators < 1) nValidators = 1;

        await addSampleKeystoresToSigner(nValidators);

        addSampleValidatorsToDB(nValidators);

        await addSamplePubkeysToValidator(nValidators);
      }

      async function addSampleKeystoresToSigner(nKeystores = 5) {
        if (nKeystores > pubkeys.length) nKeystores = pubkeys.length;

        if (nKeystores < 1) nKeystores = 1;

        const keystoresPaths = fs
          .readdirSync(keystoresPath)
          .filter((file) => file.endsWith(".json"));

        //Reduce keystoresPaths to nValidators
        keystoresPaths.splice(nKeystores);

        const keystores = keystoresPaths.map((file) =>
          fs.readFileSync(path.join(keystoresPath, file)).toString()
        );

        const passwords = Array(keystores.length).fill(keystorePass);

        await signerApi.importKeystores({
          keystores,
          passwords,
        });
      }

      function addSampleValidatorsToDB(nValidators = 5) {
        if (nValidators > pubkeys.length) nValidators = pubkeys.length;

        if (nValidators < 1) nValidators = 1;

        const pubkeysToTest = pubkeys.slice(0, nValidators);

        brainDb.addValidators({
          validators: pubkeysToTest.reduce((acc, pubkey) => {
            acc[pubkey] = {
              tag: "solo",
              feeRecipient: defaultFeeRecipient,
              automaticImport: true,
            };
            return acc;
          }, {} as { [pubkey: string]: PubkeyDetails }),
        });
      }

      async function addSamplePubkeysToValidator(nPubkeys = 5) {
        if (nPubkeys > pubkeys.length) nPubkeys = pubkeys.length;

        if (nPubkeys < 1) nPubkeys = 1;

        const pubkeysToTest = pubkeys.slice(0, nPubkeys);

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

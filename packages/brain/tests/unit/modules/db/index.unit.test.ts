import { expect } from "chai";
import sinon from "sinon";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import fs from "fs";
import { Web3SignerApi } from "../../../../src/modules/apiClients/web3signer/index.js";
import { ValidatorApi } from "../../../../src/modules/apiClients/validator/index.js";
import { execSync } from "node:child_process";
import path from "path";

describe("DataBase", () => {
  const testDbName = "testDb.json";
  const signerDnp =
    "DAppNodePackage-web3signer.web3signer-prater.dnp.dappnode.eth";
  const consensusClientDnp =
    "DAppNodePackage-validator.prysm-prater.dnp.dappnode.eth";

  beforeEach(() => {
    if (fs.existsSync(testDbName)) fs.unlinkSync(testDbName);
  });

  /**
   * Test public initializeDb()
   */
  describe("public initializeDb()", () => {
    /**
     * Should do migration if the database file is not found
     */
    it.skip("Should do migration if database file not found", async () => {
      const expectedDb = {
        "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a":
          {
            tag: "solo",
            feeRecipient: "0x0000000000000000000000000000000000000000",
            feeRecipientValidator: "0x0000000000000000000000000000000000000000",
            automaticImport: true,
          },
        "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7":
          {
            tag: "solo",
            feeRecipient: "0x0000000000000000000000000000000000000000",
            feeRecipientValidator: "0x0000000000000000000000000000000000000000",
            automaticImport: true,
          },
        "0x8f2b698583d69c7a78b4482871282602adb7fb47a1aab66c63feb48e7b9245dad77b82346e0201328d66a8b4d483b716":
          {
            tag: "solo",
            feeRecipient: "0x0000000000000000000000000000000000000000",
            feeRecipientValidator: "0x0000000000000000000000000000000000000000",
            automaticImport: true,
          },
        "0xa1735a0dd72205dae313c36d7d17f5b06685944c8886ddac530e5aedbe1fca0c8003e7e274ec1b4ddd08b884f5b9a830":
          {
            tag: "solo",
            feeRecipient: "0x0000000000000000000000000000000000000000",
            feeRecipientValidator: "0x0000000000000000000000000000000000000000",
            automaticImport: true,
          },
        "0xa2cc280ce811bb680cba309103e23dc3c9902f2a08541c6737e8adfe8198e796023b959fc8aadfad39499b56ec3dd184":
          {
            tag: "solo",
            feeRecipient: "0x0000000000000000000000000000000000000000",
            feeRecipientValidator: "0x0000000000000000000000000000000000000000",
            automaticImport: true,
          },
      };
      // get container IPs
      const signerIp = execSync(
        `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${signerDnp}`
      );
      const consensusIp = execSync(
        `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${consensusClientDnp}`
      );
      // clean database
      if (fs.existsSync(testDbName)) fs.unlinkSync(testDbName);
      // create instances
      const db = new BrainDataBase(testDbName);
      const signerApi = new Web3SignerApi({
        baseUrl: `http://${signerIp}:9000`,
        host: `web3signer.web3signer-prater.dappnode`,
      });
      const validatorApi = new ValidatorApi({
        baseUrl: `http://${consensusIp}:3500`,
        authToken: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg`,
      });
      // import to web3signer
      const keystoresPath = path.resolve(process.cwd(), "keystores");
      const keystoresPaths = fs
        .readdirSync(keystoresPath)
        .filter((file) => file.endsWith(".json"));
      const keystores = keystoresPaths.map((file) =>
        fs.readFileSync(path.join(keystoresPath, file)).toString()
      );
      const passwords = Array(keystores.length).fill("stakingbrain");
      await signerApi.importKeystores({
        keystores,
        passwords,
      });

      expect(db.data).to.be.null;
      // initialize
      await db.initialize(
        signerApi,
        validatorApi,
        "0x0000000000000000000000000000000000000000"
      );
      // print contents of database
      console.log(db.data);
      // check database
      expect(db.data).to.deep.equal(expectedDb);
    }).timeout(10000);

    /**
     * Create a new empty database if migration fails
     */
    it("Should create a new empty database if migration fails", async () => {
      const db = new BrainDataBase(testDbName);
      async function databaseMigration(): Promise<void> {
        throw new Error("Database migration failed");
      }
      const signerApi = sinon.createStubInstance(Web3SignerApi);
      const validatorApi = sinon.createStubInstance(ValidatorApi);
      sinon.stub(db, <any>"databaseMigration").callsFake(databaseMigration);
      await db.initialize(
        signerApi,
        validatorApi,
        "0x0000000000000000000000000000000000000000"
      );

      expect(fs.existsSync(testDbName)).to.be.true;
      db.read();
      expect(db.data).to.be.empty;
    }).timeout(10000);

    /**
     * Do nothing if the database file exists and is valid
     */
    it("Should do nothing if the database file exists and is valid", () => {
      const db = new BrainDataBase(testDbName);
      fs.writeFileSync(testDbName, JSON.stringify({}));
      const signerApi = sinon.createStubInstance(Web3SignerApi);
      const validatorApi = sinon.createStubInstance(ValidatorApi);
      db.initialize(
        signerApi,
        validatorApi,
        "0x0000000000000000000000000000000000000000"
      );
      expect(fs.existsSync(testDbName)).to.be.true;
      db.read();
      expect(db.data).to.be.empty;
    });
  });

  /**
   * Test public updatePubkeys()
   */
  describe("public updatePubkeys()", () => {
    it("Should update the database", () => {
      //
    });
  });

  /**
   * Test public addPubkeys()
   */
  describe("public addPubkeys()", () => {
    /**
     * Should create a new database if it doesn't exist
     */
    it("Should create a new database if it doesn't exist", () => {});

    /**
     * Should throw an error if the pubkeys to be added are invalid
     */
    it("Should throw an error if the pubkeys to be added are invalid", () => {});

    /**
     * Should throw an error if the pubkeys to be added and the existing pubkeys exceed the maximum database size
     */
    it("Should throw an error if the pubkeys to be added and the existing pubkeys exceed the maximum database size", () => {});

    /**
     * Should add the pubkeys to the database
     */
    it("Should add the pubkeys to the database", () => {});
  });

  /**
   * Test public deletePubkeys()
   */
  describe("public deletePubkeys()", () => {
    const expectedDbData = {
      "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a":
        {
          tag: "stakehouse",
          feeRecipient: "0x1000000000000000000000000000000000000000",
          feeRecipientValidator: "0x0000000000000000000000000000000000000000",
          automaticImport: true,
        },
      "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7":
        {
          tag: "rocketpool",
          feeRecipient: "0x2000000000000000000000000000000000000000",
          feeRecipientValidator: "0x0000000000000000000000000000000000000000",
          automaticImport: true,
        },
    };

    const dbData = {
      "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a":
        {
          tag: "solo",
          feeRecipient: "0x0000000000000000000000000000000000000000",
          feeRecipientValidator: "0x0000000000000000000000000000000000000000",
          automaticImport: true,
        },
      "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7":
        {
          tag: "solo",
          feeRecipient: "0x0000000000000000000000000000000000000000",
          feeRecipientValidator: "0x0000000000000000000000000000000000000000",
          automaticImport: true,
        },
    };

    const db = new BrainDataBase(testDbName);
    fs.writeFileSync(testDbName, JSON.stringify(dbData));
    db.updateValidators({
      pubkeys: [
        "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a",
        "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7",
      ],
      tags: ["stakehouse", "rocketpool"],
      feeRecipients: [
        "0x1000000000000000000000000000000000000000",
        "0x2000000000000000000000000000000000000000",
      ],
      automaticImports: [true, true],
    });
    expect(db.data).to.deep.equal(expectedDbData);
  });

  after(() => {
    if (fs.existsSync(testDbName)) fs.unlinkSync(testDbName);
  });
});

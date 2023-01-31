import { expect } from "chai";
// import sinnon
import sinon from "sinon";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import fs from "fs";
import { Web3SignerApi } from "../../../../src/modules/clientApis/web3signerApi/index.js";

describe("DataBase", () => {
  const testDbName = "testDb.json";

  beforeEach(() => {
    if (fs.existsSync(testDbName)) fs.unlinkSync(testDbName);
  });

  /**
   * Test public initializeDb()
   */
  describe("public initializeDb()", () => {
    /**
     * TODO: Should do migration if the database file is not found
     */
    it("Should do migration if database file not found", () => {
      if (fs.existsSync(testDbName)) fs.unlinkSync(testDbName);
      // TODO: Signer API and Validator API modules are not implemented yet
    });

    /**
     * Create a new empty database if migration fails
     */
    it("Should create a new empty database if migration fails", async () => {
      const db = new BrainDataBase(testDbName);
      async function databaseMigration(): Promise<void> {
        throw new Error("Database migration failed");
      }
      const signerApi = sinon.createStubInstance(Web3SignerApi);
      sinon.stub(db, <any>"databaseMigration").callsFake(databaseMigration);
      await db.initialize(signerApi);

      expect(fs.existsSync(testDbName)).to.be.true;
      db.read();
      expect(db.data).to.be.empty;
    });

    /**
     * Do nothing if the database file exists and is valid
     */
    it("Should do nothing if the database file exists and is valid", () => {
      const db = new BrainDataBase(testDbName);
      fs.writeFileSync(testDbName, JSON.stringify({}));
      const signerApi = sinon.createStubInstance(Web3SignerApi);
      db.initialize(signerApi);
      expect(fs.existsSync(testDbName)).to.be.true;
      db.read();
      expect(db.data).to.be.empty;
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
  describe("public deletePubkeys()", () => {});

  /**
   * Test private validateDb()
   */
  describe("private validateDb()", () => {});

  /**
   * Test private ensureDbMaxSize()
   */
  describe("private ensureDbMaxSize()", () => {});

  /**
   * Test private validatePubkeys()
   */
  describe("private validatePubkeys()", () => {});

  /**
   * Test private databaseMigration()
   */
  describe("private databaseMigration()", () => {});

  /**
   * Test private isValidTag()
   */
  describe("private isValidTag()", () => {});

  /**
   * Test private isValidAddress()
   */
  describe("private isValidAddress()", () => {});

  after(() => {
    if (fs.existsSync(testDbName)) fs.unlinkSync(testDbName);
  });
});

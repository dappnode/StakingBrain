import { StakingBrainDb, Tag, tags } from "@stakingbrain/common";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import fs from "fs";
import logger from "../logger/index.js";
import { Web3SignerApi } from "../apiClients/web3signer/index.js";
import { ValidatorApi } from "../apiClients/validator/index.js";

// TODO:
// The db must have a initial check and maybe should be added on every function to check whenever it is corrupted or not. It should be validated with a JSON schema
// Implement backup system

/**
 * BrainDataBase is a wrapper around lowdb to manage the database.
 * Properties parent object:
 * - data: The database
 * - adapter: The adapter
 * Methods parent object:
 * - read: Read the database
 * - write: Write the database
 * Caveats:
 * - The lowdb.write() method already takes into account if the pubkey exists or not
 */
export class BrainDataBase extends LowSync<StakingBrainDb> {
  dbName: string;

  constructor(dbName: string) {
    // JSONFileSync adapters will set db.data to null if file dbName doesn't exist.
    super(new JSONFileSync<StakingBrainDb>(dbName));
    this.dbName = dbName;
  }

  /**
   * Initializes the database: IMPORTANT! this method must not throw an error since it will be called from index.ts
   * - If the database file doesn't exist, it will attempt to perform a migration
   * - If the migration fails, it will create a new empty database
   * - If the database file exists, it will validate it
   */
  public async initialize(
    signerApi: Web3SignerApi,
    validatorApi: ValidatorApi
  ): Promise<void> {
    try {
      // Important! .read() method must be called before accessing brainDb.data otherwise it will be null
      this.read();
      if (this.data === null) {
        logger.info(
          `Database file ${this.dbName} not found. Attemping to perform migration...`
        );
        await this.databaseMigration(signerApi, validatorApi);
      }
      // TODO: Right after initializing db it should be updated with sources of truth: signer and validator
    } catch (e) {
      logger.error(`unable to initialize the db ${this.dbName}`, e);
      this.validateDb();
    }
  }

  /**
   * Adds 1 or more public keys and their details to the database
   * @param pubkeys - object containing the public keys and their details
   * ```
   * { "pubkey1": {
   *   "tag": "obol",
   *   "feeRecipient": "0x1234567890",
   *   "feeRecipientValidator": "0x123456
   *   "automaticImport": true
   *   },
   * }
   * ```
   */
  public addPubkeys({
    pubkeys,
    tags,
    feeRecipients,
  }: {
    pubkeys: string[];
    tags: Tag[];
    feeRecipients: string[];
  }): void {
    try {
      const pubkeyDetails = this.buildPubkeysDetails(
        pubkeys,
        tags,
        feeRecipients
      );
      this.validateDb();
      // Remove pubkeys that already exist
      if (this.data) {
        for (const pubkey of Object.keys(pubkeyDetails)) {
          if (this.data[pubkey]) {
            logger.warn(`Pubkey ${pubkey} already in the database`);
            delete pubkeyDetails[pubkey];
          }
        }
      }
      this.ensureDbMaxSize(pubkeyDetails);
      this.validatePubkeys(pubkeyDetails);
      this.data = { ...this.data, ...pubkeyDetails };
      this.write();
    } catch (e) {
      e.message =
        `Unable to add pubkeys ${Object.keys(pubkeys).join(", ")}` +
        `\n${e.message}`;
      throw Error(e);
    }
  }

  /**
   * Updates 1 or more public keys details from the database
   */
  public updatePubkeys(pubkeys: StakingBrainDb): void {
    try {
      this.validateDb();
      // Remove pubkeys that don't exist
      if (this.data) {
        for (const pubkey of Object.keys(pubkeys)) {
          if (!this.data[pubkey]) {
            logger.warn(`Pubkey ${pubkey} not found in the database`);
            delete pubkeys[pubkey];
          }
        }
      }
      this.validatePubkeys(pubkeys);
      this.data = { ...pubkeys, ...this.data };
      this.write();
    } catch (e) {
      e.message =
        `Unable to update pubkeys ${Object.keys(pubkeys).join(", ")}` +
        `\n${e.message}`;
      throw Error(e);
    }
  }

  /**
   * Deletes 1 or more public keys and its details from the database
   * @param pubkeys - The public keys to delete
   */
  public deletePubkeys(pubkeys: string[]): void {
    try {
      this.validateDb();
      if (!this.data) return;
      for (const pubkey of pubkeys) {
        if (!this.data[pubkey]) {
          logger.warn(`Pubkey ${pubkey} not found in the database`);
        } else delete this.data[pubkey];
        this.write();
      }
    } catch (e) {
      e.message =
        `Unable to delete pubkeys ${Object.keys(pubkeys).join(", ")}` +
        `\n${e.message}`;
      throw Error(e);
    }
  }

  /**
   * Cleans the database
   */
  public deleteDatabase(): void {
    try {
      this.data = {};
      this.write();
    } catch (e) {
      e.message =
        `Unable to prune database. Creating a new one...` + `\n${e.message}`;
      logger.error(e);
      if (fs.existsSync(this.dbName)) fs.unlinkSync(this.dbName);
      this.createJsonFile();
    }
  }

  // Utils

  /**
   * Builds the object to be added to the braindb
   */
  private buildPubkeysDetails(
    pubkeys: string[],
    tags: Tag[],
    feeRecipients: string[],
    automaticImport = true
  ): StakingBrainDb {
    const pubkeysDetails: StakingBrainDb = {};
    for (let i = 0; i < pubkeys.length; i++) {
      pubkeysDetails[pubkeys[i]] = {
        tag: tags[i],
        feeRecipient: feeRecipients[i],
        feeRecipientValidator: feeRecipients[i],
        automaticImport,
      };
    }
    return pubkeysDetails;
  }

  /**
   * Validates the database it is in the correct format
   */
  private validateDb(): void {
    try {
      this.read();
      if (this.data === null) {
        logger.warn(`Database file ${this.dbName} not found. Creating it...`);
        this.createJsonFile();
      }
    } catch (e) {
      e.message =
        `The database is corrupted. Cleaning database` + `\n${e.message}`;
      logger.error(e);
      this.deleteDatabase();
      this.read();
    }
  }

  /**
   * Ensures the DB never exceeds the max size.
   * Average db size for:
   * - 2000 pubkeys: 476KB
   * - 1000 pubkeys: 240KB
   * - 500 pubkeys: 120KB
   * - 100 pubkeys: 24KB
   * - 50 pubkeys: 12KB
   * - 10 pubkeys: 4KB
   * - 1 pubkey: 4KB
   * Average pubkey size to be added: 213 bytes
   */
  private ensureDbMaxSize(pubkeys: StakingBrainDb): void {
    const MAX_DB_SIZE = 6 * 1024 * 1024;
    const dbSize = fs.statSync(this.dbName).size;
    const pubkeysSize = Buffer.byteLength(JSON.stringify(pubkeys));
    if (dbSize + pubkeysSize > MAX_DB_SIZE) {
      throw Error(
        `The database is too big. Max size is ${MAX_DB_SIZE} bytes. Current size is ${dbSize} bytes. Data to be added is ${pubkeysSize} bytes.`
      );
    }
  }

  /**
   * Performs the database migration for the first run
   */
  private async databaseMigration(
    signerApi: Web3SignerApi,
    validatorApi: ValidatorApi
  ): Promise<void> {
    try {
      // Create json file
      this.createJsonFile();
      // Fetch public keys from signer API
      const pubkeys = (await signerApi.getKeystores()).data.map(
        (keystore) => keystore.validating_pubkey
      );
      if (pubkeys.length === 0) {
        logger.info(`No public keys found in the signer API`);
        return;
      }
      const defaultFeeRecipient =
        (await validatorApi.getFeeRecipient(pubkeys[0])).data?.ethaddress ||
        "0x0000000000000000000000000000000000000000";
      const defaultTag = "solo";

      this.addPubkeys({
        pubkeys,
        tags: Array(pubkeys.length).fill(defaultTag),
        feeRecipients: Array(pubkeys.length).fill(defaultFeeRecipient),
      });
    } catch (e) {
      e.message =
        `Error: Unable to perform database migration` + `\n${e.message}`;
      throw Error(e);
    }
    return;
  }

  /**
   * Creates a new database file if does not exist
   */
  private createJsonFile(): void {
    fs.writeFileSync(this.dbName, "{}");
    this.read();
  }

  private validatePubkeys(pubkeys: StakingBrainDb): void {
    const errors: string[] = [];
    Object.keys(pubkeys).forEach((pubkey) => {
      const pubkeyDetails = pubkeys[pubkey];

      // Validate Ethereum address
      if (!this.isValidBlsPubkey(pubkey))
        errors.push(`\n  pubkey ${pubkey}: bls is invalid`);

      if (!pubkeyDetails) {
        errors.push(`\n  pubkey ${pubkey}: pubkey details are missing`);
        return;
      }

      // Tag
      if (!pubkeyDetails.tag) {
        errors.push(`\n  pubkey ${pubkey}: tag is missing`);
      } else {
        if (typeof pubkeyDetails.tag !== "string")
          errors.push(
            `\n  pubkey ${pubkey}: tag is invalid, must be in string format`
          );
        if (!this.isValidTag(pubkeyDetails.tag))
          errors.push(`\n  pubkey ${pubkey}: tag is invalid`);
      }

      // FeeRecipient
      if (!pubkeyDetails.feeRecipient) {
        errors.push(`\n  pubkey ${pubkey}: feeRecipient address is missing`);
      } else {
        if (typeof pubkeyDetails.feeRecipient !== "string")
          errors.push(
            `\n  pubkey ${pubkey}: feeRecipient address is invalid, must be in string format`
          );
        if (!this.isValidEcdsa(pubkeyDetails.feeRecipient))
          errors.push(`\n  pubkey ${pubkey}: fee recipient is invalid`);
      }

      // FeeRecipientValidator (it may be empty)
      if (pubkeyDetails.feeRecipientValidator) {
        if (typeof pubkeyDetails.feeRecipientValidator !== "string")
          errors.push(
            `\n  pubkey ${pubkey}: feeRecipientValidator address is invalid, must be in string format`
          );
        if (!this.isValidEcdsa(pubkeyDetails.feeRecipientValidator))
          errors.push(
            `\n  pubkey ${pubkey}: fee recipient validator is invalid`
          );
      }

      // AutomaticImport
      if (typeof pubkeyDetails.automaticImport === "undefined") {
        errors.push(`\n  pubkey ${pubkey}: automaticImport is missing`);
      } else {
        if (typeof pubkeys[pubkey].automaticImport !== "boolean")
          errors.push(
            `\n  pubkey ${pubkey}: automaticImport is invalid, must be in boolean format`
          );
      }
    });

    if (errors.length > 0) throw Error(errors.join("\n"));
  }

  private isValidEcdsa(address: string): boolean {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) return false;
    return true;
  }

  private isValidBlsPubkey(pubkey: string): boolean {
    if (!pubkey.match(/^0x[a-fA-F0-9]{96}$/)) return false;
    return true;
  }

  private isValidTag(tag: Tag): boolean {
    if (!tags.includes(tag)) return false;
    return true;
  }
}

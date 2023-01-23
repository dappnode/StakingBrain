import { StakingBrainDb, Tag, tags } from "@stakingbrain/common";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import fs from "fs";

// TODO:
// This db is not meant for large JavaScript objects (~10-100MB)
// The db must have a initial check and maybe should be added on every function to check whenever it is corrupted or not. It should be validated with a JSON schema
// Implement backup system

class BrainDataBase extends LowSync<StakingBrainDb> {
  dbName: string;

  /**
   * Caveats:
   * - The lowdb.write() method already takes into account if the pubkey exists or not
   */

  /**
   * Properties parent object:
   * - data: The database
   * - adapter: The adapter
   */

  /**
   * Methods parent object:
   * - read: Read the database
   * - write: Write the database
   */

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
  public async initialize(): Promise<void> {
    try {
      // Important! .read() method must be called before accessing brainDb.data otherwise it will be null
      this.read();
      if (this.data === null) {
        console.log(
          `Database file ${this.dbName} not found. Attemping to perform migration...`
        );
        await this.databaseMigration();
      }
    } catch (e) {
      e.message += ` Error: unable to initialize the db ${this.dbName}`;
      console.error(e);
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
  public addPubkeys(pubkeys: StakingBrainDb): void {
    try {
      this.validateDb();
      this.ensureDbMaxSize(pubkeys);
      this.validatePubkeys(pubkeys);
      this.data = { ...this.data, ...pubkeys };
      this.write();
    } catch (e) {
      e.message += `\nError: unable to add pubkeys ${Object.keys(pubkeys).join(
        ", "
      )}`;
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
      if (this.data) {
        for (const pubkey of pubkeys) delete this.data[pubkey];
        this.write();
      }
    } catch (e) {
      e.message += `\nError: unable to delete pubkeys ${Object.keys(
        pubkeys
      ).join(", ")}`;
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
      console.error(e);
    }
  }

  // Utils

  /**
   * Validates the database it is in the correct format
   */
  private validateDb(): void {
    try {
      this.read();
      if (this.data === null) {
        console.warn(`Database file ${this.dbName} not found. Creating it...`);
        this.createJsonFile();
      }
    } catch (e) {
      e.message += `\nError: The database is corrupted. Cleaning database`;
      console.error(e);
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
    // print pubkeys size in KB
    console.log(
      `Database size: ${dbSize} bytes. Pubkeys size: ${pubkeysSize} bytes.`
    );
    if (dbSize + pubkeysSize > MAX_DB_SIZE) {
      throw Error(
        `The database is too big. Max size is ${MAX_DB_SIZE} bytes. Current size is ${dbSize} bytes. Data to be added is ${pubkeysSize} bytes.`
      );
    }
  }

  /**
   * Performs the database migration for the first run
   */
  private async databaseMigration(): Promise<void> {
    // TODO: implement migration. Depends on signer and validator API modules
    try {
      // 0. Create json file
      this.createJsonFile();
      // 1. Get public keys from signer API
      // 2. Get fee recipient for each pubkey from validator API
      // 3. Set default tag and automatic import
    } catch (e) {}
    return;
  }

  /**
   * Creates a new database file if does not exist
   */
  private createJsonFile(): void {
    fs.writeFileSync(this.dbName, "{}");
  }

  private validatePubkeys(pubkeys: StakingBrainDb): void {
    const errors: string[] = [];
    Object.keys(pubkeys).forEach((pubkey) => {
      const pubkeyDetails = pubkeys[pubkey];

      // Validate Ethereum address
      if (!this.isValidAddress(pubkey))
        errors.push(`\n  pubkey ${pubkey}: ethereum address is invalid`);

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
        if (!this.isValidAddress(pubkey))
          errors.push(`\n  pubkey ${pubkey}: ethereum address is invalid`);
      }

      // FeeRecipientValidator (it may be empty)
      if (pubkeyDetails.feeRecipientValidator) {
        if (typeof pubkeyDetails.feeRecipientValidator !== "string")
          errors.push(
            `\n  pubkey ${pubkey}: feeRecipientValidator address is invalid, must be in string format`
          );
        if (!this.isValidAddress(pubkey))
          errors.push(`\n  pubkey ${pubkey}: ethereum address is invalid`);
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

    if (errors.length > 0) throw Error(errors.join(""));
  }

  private isValidAddress(address: string): boolean {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) return false;
    return true;
  }

  private isValidTag(tag: Tag): boolean {
    if (!tags.includes(tag)) return false;
    return true;
  }
}

export const brainDb = new BrainDataBase(`brain-db.json`);

import { StakingBrainDb, ValidatorUpdate } from "./types.js";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import fs from "fs";
import logger from "../logger/index.js";
import { Web3SignerApi, ValidatorApi } from "../apiClients/index.js";
import { params } from "../../params.js";
import { isValidTag } from "./utils.js";
import { shortenPubkey, isValidBlsPubkey, isValidEcdsaPubkey, validateBuilderConfig } from "@stakingbrain/common";
import { BrainDbError } from "./error.js";

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
  private dbName: string;

  constructor(dbName: string) {
    // JSONFileSync adapters will set db.data to empty object if file dbName doesn't exist.
    super(new JSONFileSync<StakingBrainDb>(dbName), {});
    this.dbName = dbName;
  }

  public override write(): void {
    super.write();
    // The JSON adapter replaces the file atomically; restore the private mode on
    // the replacement too, since records may contain builder authorization data.
    this.setOwnerWriteRead();
  }

  /**
   * Returns the database content.
   * - If the database is empty, it will return an empty object
   * - Refuses unreadable or invalid data so reload cannot mistake corruption for deleted validators
   *
   * @returns an object in format StakingBrainDb (it could be an empty object {})
   */
  public getData(): StakingBrainDb {
    this.validateDb();
    return this.data as StakingBrainDb;
  }

  /**
   * Initializes the database. Failure must stop startup before destructive reconciliation runs.
   * - If the database file doesn't exist, it will attempt to perform a migration
   * - If migration fails, startup fails with the original database preserved
   * - If the database file exists, it will validate it
   */
  public async initialize(signerApi: Web3SignerApi, validatorApi: ValidatorApi): Promise<void> {
    try {
      // Important! .read() method must be called before accessing brainDb.data otherwise it will be empty object
      this.validateDb();
      // If db.json doesn't exist, db.data will be an empty object
      if (Object.keys(this.data ?? {}).length === 0) await this.databaseMigration(signerApi, validatorApi);
      else this.setOwnerWriteRead();
    } catch (e) {
      logger.error(`unable to initialize the db ${this.dbName}`, e);
      throw e;
    }
  }

  /**
   * Closes the database
   */
  public close(): void {
    this.setOwnerRead();
  }

  /**
   * Check new records before an external signer import changes persistent state.
   */
  public validateNewValidators(validators: StakingBrainDb): void {
    this.validateDb();
    const existing = new Set(Object.keys(this.data).map((pubkey) => pubkey.toLowerCase()));
    const additions = Object.fromEntries(
      Object.entries(validators).filter(([pubkey]) => !existing.has(pubkey.toLowerCase()))
    );
    this.ensureDbMaxSize(additions);
    this.validateAddValidators(additions);
  }

  /** Adds new validator records while preserving the settings of existing keys. */
  public addValidators({ validators }: { validators: StakingBrainDb }): void {
    try {
      this.validateDb();
      // Remove pubkeys that already exist
      const existing = new Set(Object.keys(this.data).map((pubkey) => pubkey.toLowerCase()));
      if (this.data)
        for (const pubkey of Object.keys(validators))
          if (existing.has(pubkey.toLowerCase())) {
            logger.warn(`Pubkey ${pubkey} already in the database`);
            delete validators[pubkey];
          }

      this.validateNewValidators(validators);
      this.data = { ...this.data, ...validators };
      this.write();
    } catch (e) {
      throw new BrainDbError(`Unable to add pubkeys ${Object.keys(validators).join(", ")}. ${e.message}`);
    }
  }

  /**
   * Update supplied validator settings without erasing omitted settings.
   */
  public updateValidators(validators: readonly ValidatorUpdate[]): void {
    try {
      this.validateDb();
      this.validateUpdateValidators(validators);
      const updatedData = { ...this.data };
      for (const { pubkey, ...changes } of validators) {
        if (!this.data[pubkey]) {
          logger.warn(`Pubkey ${pubkey} not found in the database`);
          continue;
        }
        updatedData[pubkey] = { ...this.data[pubkey], ...changes };
      }
      this.ensureDbMaxSize(updatedData, true);
      this.data = updatedData;
      this.write();
    } catch (e) {
      throw new BrainDbError(
        `Unable to update pubkeys ${validators.map(({ pubkey }) => pubkey).join(", ")}. ${e.message}`
      );
    }
  }

  /**
   * Deletes 1 or more public keys and its details from the database
   * @param pubkeys - The public keys to delete
   */
  public deleteValidators(pubkeys: string[]): void {
    try {
      this.validateDb();
      if (!this.data) return;
      const storedKeys = new Map(Object.keys(this.data).map((key) => [key.toLowerCase(), key]));
      let changed = false;
      for (const pubkey of pubkeys) {
        const storedKey = storedKeys.get(pubkey.toLowerCase());
        if (!storedKey) {
          logger.warn(`Pubkey ${pubkey} not found in the database`);
        } else {
          delete this.data[storedKey];
          changed = true;
        }
      }
      if (changed) this.write();
    } catch (e) {
      throw new BrainDbError(`Unable to delete pubkeys ${Object.keys(pubkeys).join(", ")}. ${e.message}`);
    }
  }

  // PRIVATE METHODS //

  /**
   * Set write permissions to the database file
   */
  private setOwnerWriteRead(): void {
    fs.chmodSync(this.dbName, 0o600);
  }

  /**
   * Set read permissions to the database file
   */
  private setOwnerRead(): void {
    fs.chmodSync(this.dbName, 0o400);
  }

  /**
   * Validates the database it is in the correct format:
   * - Creates JSON file if it doesn't exist
   * - Throws on corrupted data without replacing it
   */
  private validateDb(): void {
    try {
      if (!fs.existsSync(this.dbName)) {
        if (Object.keys(this.data ?? {}).length > 0)
          throw new BrainDbError("Database file disappeared while validators were loaded");
        logger.warn(`Database file ${this.dbName} not found. Creating it...`);
        this.createJsonFileAndPermissions();
      }
      // LowSync.read() ignores falsy JSON values, so inspect the adapter result directly.
      const persisted = this.adapter.read();
      if (!persisted || typeof persisted !== "object" || Array.isArray(persisted))
        throw new BrainDbError("Expected a validator database object");
      this.validateAddValidators(persisted);
      this.data = persisted;
    } catch (e) {
      throw new BrainDbError(
        `Unable to read database ${this.dbName}; refusing to reconcile validator keys. ${e.message}`
      );
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
  private ensureDbMaxSize(validators: StakingBrainDb, replace = false): void {
    const MAX_DB_SIZE = 6 * 1024 * 1024;
    const dbSize = replace ? 0 : fs.statSync(this.dbName).size;
    const pubkeysSize = Buffer.byteLength(JSON.stringify(validators, null, 2));
    if (dbSize + pubkeysSize > MAX_DB_SIZE)
      throw new BrainDbError(
        `The database is too big. Max size is ${MAX_DB_SIZE} bytes. Current size is ${dbSize} bytes. Data to be added is ${pubkeysSize} bytes. `
      );
  }

  /**
   * Performs the database migration for the first run:
   * - Fetches the public keys from the signer API
   * - Fetches the fee recipient from the validator API (if not available uses the default fee recipient, no error is thrown)
   * - Adds the public keys to the database
   *
   * @throws Error if signer API is not available
   *
   * @param signerApi - The signer API
   * @param validatorApi - The validator API
   */
  private async databaseMigration(signerApi: Web3SignerApi, validatorApi: ValidatorApi): Promise<void> {
    let retries = 0;
    while (retries < 10) {
      try {
        logger.info(`Database file ${this.dbName} not found. Attemping to perform migration...`);
        this.validateDb();
        if (Object.keys(this.data).length > 0) return;
        // Fetch public keys from signer API
        const pubkeys = (await signerApi.listRemoteKeys()).data.map((keystore) => keystore.validating_pubkey);
        if (pubkeys.length === 0) {
          logger.info(`No public keys found in the signer API`);
          return;
        } else logger.info(`Found ${pubkeys.length} public keys to migrate`);

        const validators: StakingBrainDb = {};
        for (const pubkey of pubkeys) {
          const feeRecipient = (await validatorApi.getFeeRecipient(pubkey)).data.ethaddress;
          validators[pubkey] = { tag: params.defaultTag, feeRecipient, automaticImport: false };
        }
        this.addValidators({ validators });

        logger.info(`Database migration completed`);
        return;
      } catch (e) {
        retries++;
        if (retries < 10) {
          logger.error(`Unable to perform database migration. Retrying in 6 seconds...`, e);
          await new Promise((resolve) => {
            logger.info(`Retrying database migration for ${(retries + 1).toString()} time...`);
            setTimeout(resolve, 6 * 1000);
          });
        } else {
          throw new BrainDbError(`Unable to perform database migration. ${e.message}`);
        }
      }
    }
  }

  /**
   * Creates a new database file if does not exist and sets the correct permissions
   */
  private createJsonFileAndPermissions(): void {
    fs.writeFileSync(this.dbName, "{}");
    this.setOwnerWriteRead();
    this.read();
  }

  private validateUpdateValidators(validators: readonly ValidatorUpdate[]): void {
    const errors: string[] = [];
    const seen = new Set<string>();
    for (const validator of validators) {
      const { pubkey } = validator;

      // create substring of pubkey to be used in error message
      const pubkeySubstr = shortenPubkey(pubkey);

      // Validate Ethereum address
      if (!isValidBlsPubkey(pubkey)) errors.push(`\n  pubkey ${pubkeySubstr}: bls is invalid`);

      if (seen.has(pubkey)) errors.push(`\n  pubkey ${pubkeySubstr}: duplicate update`);
      seen.add(pubkey);

      // FeeRecipient
      if ("feeRecipient" in validator) {
        if (typeof validator.feeRecipient !== "string")
          errors.push(`\n  pubkey ${pubkeySubstr}: feeRecipient address is invalid, must be in string format`);
        if (typeof validator.feeRecipient !== "string" || !isValidEcdsaPubkey(validator.feeRecipient))
          errors.push(`\n  pubkey ${pubkeySubstr}: fee recipient is invalid`);
      }
      if ("builderConfig" in validator && validator.builderConfig !== null)
        validateBuilderConfig(validator.builderConfig);
    }
    if (errors.length > 0) throw new BrainDbError(errors.join("\n"));
  }

  private validateAddValidators(validators: StakingBrainDb): void {
    const errors: string[] = [];
    Object.keys(validators).forEach((pubkey) => {
      const pubkeyDetails = validators[pubkey];

      // create substring of pubkey to be used in error message
      const pubkeySubstr = shortenPubkey(pubkey);

      // Validate Ethereum address
      if (!isValidBlsPubkey(pubkey)) errors.push(`\n  pubkey ${pubkeySubstr}: bls is invalid`);

      if (!pubkeyDetails) {
        errors.push(`\n  pubkey ${pubkeySubstr}: pubkey details are missing`);
        return;
      }

      // Tag
      if (!pubkeyDetails.tag) {
        errors.push(`\n  pubkey ${pubkeySubstr}: tag is missing`);
      } else {
        if (typeof pubkeyDetails.tag !== "string")
          errors.push(`\n  pubkey ${pubkeySubstr}: tag is invalid, must be in string format`);
        if (!isValidTag(pubkeyDetails.tag)) errors.push(`\n  pubkey ${pubkeySubstr}: tag is invalid`);
      }

      // FeeRecipient
      if (!pubkeyDetails.feeRecipient) {
        errors.push(`\n  pubkey ${pubkeySubstr}: feeRecipient address is missing`);
      } else {
        if (typeof pubkeyDetails.feeRecipient !== "string")
          errors.push(`\n  pubkey ${pubkeySubstr}: feeRecipient address is invalid, must be in string format`);
        if (!isValidEcdsaPubkey(pubkeyDetails.feeRecipient))
          errors.push(`\n  pubkey ${pubkeySubstr}: fee recipient is invalid`);
      }

      // AutomaticImport
      if (pubkeyDetails.importPending !== undefined && typeof pubkeyDetails.importPending !== "boolean")
        errors.push(`\n  pubkey ${pubkeySubstr}: importPending must be a boolean`);
      if ("builderConfig" in pubkeyDetails && pubkeyDetails.builderConfig !== null)
        validateBuilderConfig(pubkeyDetails.builderConfig);
      if (typeof pubkeyDetails.automaticImport === "undefined") {
        errors.push(`\n  pubkey ${pubkeySubstr}: automaticImport is missing`);
      } else {
        if (typeof validators[pubkey].automaticImport !== "boolean")
          errors.push(`\n  pubkey ${pubkeySubstr}: automaticImport is invalid, must be in boolean format`);
      }
    });

    if (errors.length > 0) throw new BrainDbError(errors.join("\n"));
  }
}

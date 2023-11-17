import {
  StakingBrainDb,
  isValidEcdsaPubkey,
  isValidTag,
  isValidBlsPubkey,
  shortenPubkey,
  StakingBrainDbUpdate,
  PubkeyDetails,
} from "@stakingbrain/common";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import fs from "fs";
import logger from "../logger/index.js";
import { Web3SignerApi } from "../apiClients/web3signer/index.js";
import { ValidatorApi } from "../apiClients/validator/index.js";
import { params } from "../../params.js";

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
    // JSONFileSync adapters will set db.data to null if file dbName doesn't exist.
    super(new JSONFileSync<StakingBrainDb>(dbName));
    this.dbName = dbName;
  }

  /**
   * Returns the database content.
   * - If the database is empty, it will return an empty object
   * - If the database is corrupted, it will erase it and create a new empty database with the correct permissions
   *
   * @returns an object in format StakingBrainDb (it could be an empty object {})
   */
  public getData(): StakingBrainDb {
    this.validateDb();
    return this.data as StakingBrainDb;
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
      // If db.json doesn't exist, db.data will be null
      if (this.data === null)
        await this.databaseMigration(signerApi, validatorApi);
      else this.setOwnerWriteRead();
    } catch (e) {
      logger.error(`unable to initialize the db ${this.dbName}`, e);
      this.validateDb();
    }
  }

  /**
   * Closes the database
   */
  public close(): void {
    this.setOwnerRead();
  }

  /**
   * Adds 1 or more public keys and their details to the database
   */
  public addValidators({ validators }: { validators: StakingBrainDb }): void {
    try {
      this.validateDb();
      // Remove pubkeys that already exist
      if (this.data)
        for (const pubkey of Object.keys(validators))
          if (this.data[pubkey]) {
            logger.warn(`Pubkey ${pubkey} already in the database`);
            delete validators[pubkey];
          }

      this.ensureDbMaxSize(validators);
      this.validateAddValidators(validators);
      this.data = { ...this.data, ...validators };
      this.write();
    } catch (e) {
      e.message += `Unable to add pubkeys ${Object.keys(validators).join(
        ", "
      )}. `;
      throw e;
    }
  }

  /**
   * Updates 1 or more public keys details from the database
   */
  public updateValidators({
    validators,
  }: {
    validators: StakingBrainDbUpdate;
  }): void {
    try {
      this.validateDb();
      this.validateUpdateValidators(validators);
      if (this.data)
        for (const pubkey of Object.keys(validators)) {
          if (!this.data[pubkey]) {
            // Remove pubkeys that don't exist
            logger.warn(`Pubkey ${pubkey} not found in the database`);
            delete validators[pubkey];
          } else
            this.data[pubkey].feeRecipient = validators[pubkey].feeRecipient;
        }

      this.write();
    } catch (e) {
      e.message += `Unable to update pubkeys ${Object.keys(validators).join(
        ", "
      )}`;
      throw e;
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
      for (const pubkey of pubkeys) {
        if (!this.data[pubkey]) {
          logger.warn(`Pubkey ${pubkey} not found in the database`);
        } else delete this.data[pubkey];
        this.write();
      }
    } catch (e) {
      e.message += `Unable to delete pubkeys ${Object.keys(pubkeys).join(
        ", "
      )}`;
      throw e;
    }
  }

  // PRIVATE METHODS //

  /**
   * Cleans the database:
   * - Writes an empty object to the database
   * - On error deletes the database file and creates a new one
   */
  private pruneDatabase(): void {
    try {
      this.data = {};
      this.write();
    } catch (e) {
      logger.error(`Unable to prune database. Creating a new one...`, e);
      if (fs.existsSync(this.dbName)) fs.unlinkSync(this.dbName);
      this.createJsonFileAndPermissions();
    }
  }

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
   * - Deletes the database if it is corrupted and creates a new one
   */
  private validateDb(): void {
    try {
      this.read();
      if (this.data === null) {
        logger.warn(`Database file ${this.dbName} not found. Creating it...`);
        this.createJsonFileAndPermissions();
      }
    } catch (e) {
      logger.error(`The database is corrupted. Cleaning database`, e);
      this.pruneDatabase();
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
  private ensureDbMaxSize(validators: StakingBrainDb): void {
    const MAX_DB_SIZE = 6 * 1024 * 1024;
    const dbSize = fs.statSync(this.dbName).size;
    const pubkeysSize = Buffer.byteLength(JSON.stringify(validators));
    if (dbSize + pubkeysSize > MAX_DB_SIZE)
      throw Error(
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
  private async databaseMigration(
    signerApi: Web3SignerApi,
    validatorApi: ValidatorApi
  ): Promise<void> {
    let retries = 0;
    while (retries < 10) {
      try {
        logger.info(
          `Database file ${this.dbName} not found. Attemping to perform migration...`
        );
        // Create json file
        this.createJsonFileAndPermissions();
        // Fetch public keys from signer API
        const pubkeys = (await signerApi.getKeystores()).data.map(
          (keystore) => keystore.validating_pubkey
        );
        if (pubkeys.length === 0) {
          logger.info(`No public keys found in the signer API`);
          return;
        } else logger.info(`Found ${pubkeys.length} public keys to migrate`);

        let feeRecipient = "";
        await validatorApi
          .getFeeRecipient(pubkeys[0])
          .then((response) => {
            feeRecipient = response.data.ethaddress;
          })
          .catch((e) => {
            logger.error(
              `Unable to fetch fee recipient for ${pubkeys[0]}. Setting default ${params.burnAddress}}`,
              e
            );
            // TODO: consider setting MEV fee recipient
            feeRecipient = params.burnAddress;
          });

        logger.info(
          `The fee recipient to be used in the migration is ${feeRecipient}`
        );

        this.addValidators({
          validators: pubkeys.reduce((acc, pubkey) => {
            acc[pubkey] = {
              tag: params.defaultTag,
              feeRecipient,
              automaticImport: false,
            };
            return acc;
          }, {} as { [pubkey: string]: PubkeyDetails }),
        });

        logger.info(`Database migration completed`);
        return;
      } catch (e) {
        if (retries < 30) {
          retries++;
          logger.error(
            `Unable to perform database migration. Retrying in 6 seconds...`,
            e
          );
          await new Promise((resolve) => {
            logger.info(
              `Retrying database migration for ${(
                retries + 1
              ).toString()} time...`
            );
            setTimeout(resolve, 6 * 1000);
          });
        } else {
          e.message += `Unable to perform database migration`;
          throw e;
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

  private validateUpdateValidators(validators: StakingBrainDbUpdate): void {
    const errors: string[] = [];
    Object.keys(validators).forEach((pubkey) => {
      const pubkeyDetails = validators[pubkey];

      // create substring of pubkey to be used in error message
      const pubkeySubstr = shortenPubkey(pubkey);

      // Validate Ethereum address
      if (!isValidBlsPubkey(pubkey))
        errors.push(`\n  pubkey ${pubkeySubstr}: bls is invalid`);

      if (!pubkeyDetails) {
        errors.push(`\n  pubkey ${pubkeySubstr}: pubkey details are missing`);
        return;
      }

      // FeeRecipient
      if (!pubkeyDetails.feeRecipient) {
        errors.push(
          `\n  pubkey ${pubkeySubstr}: feeRecipient address is missing`
        );
      } else {
        if (typeof pubkeyDetails.feeRecipient !== "string")
          errors.push(
            `\n  pubkey ${pubkeySubstr}: feeRecipient address is invalid, must be in string format`
          );
        if (!isValidEcdsaPubkey(pubkeyDetails.feeRecipient))
          errors.push(`\n  pubkey ${pubkeySubstr}: fee recipient is invalid`);
      }
    });
  }

  private validateAddValidators(validators: StakingBrainDb): void {
    const errors: string[] = [];
    Object.keys(validators).forEach((pubkey) => {
      const pubkeyDetails = validators[pubkey];

      // create substring of pubkey to be used in error message
      const pubkeySubstr = shortenPubkey(pubkey);

      // Validate Ethereum address
      if (!isValidBlsPubkey(pubkey))
        errors.push(`\n  pubkey ${pubkeySubstr}: bls is invalid`);

      if (!pubkeyDetails) {
        errors.push(`\n  pubkey ${pubkeySubstr}: pubkey details are missing`);
        return;
      }

      // Tag
      if (!pubkeyDetails.tag) {
        errors.push(`\n  pubkey ${pubkeySubstr}: tag is missing`);
      } else {
        if (typeof pubkeyDetails.tag !== "string")
          errors.push(
            `\n  pubkey ${pubkeySubstr}: tag is invalid, must be in string format`
          );
        if (!isValidTag(pubkeyDetails.tag))
          errors.push(`\n  pubkey ${pubkeySubstr}: tag is invalid`);
      }

      // FeeRecipient
      if (!pubkeyDetails.feeRecipient) {
        errors.push(
          `\n  pubkey ${pubkeySubstr}: feeRecipient address is missing`
        );
      } else {
        if (typeof pubkeyDetails.feeRecipient !== "string")
          errors.push(
            `\n  pubkey ${pubkeySubstr}: feeRecipient address is invalid, must be in string format`
          );
        if (!isValidEcdsaPubkey(pubkeyDetails.feeRecipient))
          errors.push(`\n  pubkey ${pubkeySubstr}: fee recipient is invalid`);
      }

      // AutomaticImport
      if (typeof pubkeyDetails.automaticImport === "undefined") {
        errors.push(`\n  pubkey ${pubkeySubstr}: automaticImport is missing`);
      } else {
        if (typeof validators[pubkey].automaticImport !== "boolean")
          errors.push(
            `\n  pubkey ${pubkeySubstr}: automaticImport is invalid, must be in boolean format`
          );
      }
    });

    if (errors.length > 0) throw Error(errors.join("\n"));
  }
}

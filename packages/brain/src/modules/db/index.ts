import {
  StakingBrainDb,
  Tag,
  isValidEcdsaPubkey,
  isValidTag,
  isValidBlsPubkey,
} from "@stakingbrain/common";
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
    validatorApi: ValidatorApi,
    defaultFeeRecipient: string,
    signerUrl: string
  ): Promise<void> {
    try {
      // Important! .read() method must be called before accessing brainDb.data otherwise it will be null
      this.read();
      // If db.json doesn't exist, db.data will be null
      if (this.data === null) {
        logger.info(
          `Database file ${this.dbName} not found. Attemping to perform migration...`
        );
        await this.databaseMigration(
          signerApi,
          validatorApi,
          defaultFeeRecipient
        );
      } else this.setOwnerWriteRead();
      await this.reloadData(signerApi, validatorApi, signerUrl);
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
   * Reload db data based on truth sources: validator and signer APIs
   */
  public async reloadData(
    signerApi: Web3SignerApi,
    validatorApi: ValidatorApi,
    signerUrl: string
  ) {
    try {
      logger.info(`Reloading data...`);
      // 1. Read DB (pubkeys, fee recipients, tags)
      // TODO: add test
      this.read();
      if (!this.data) logger.warn(`Database is empty`);
      // 2. GET signer API pubkeys
      // TODO: add test
      const signerPubkeys = (await signerApi.getKeystores()).data.map(
        (keystore) => keystore.validating_pubkey
      );
      // 3. GET validator API pubkeys and fee recipients
      // TODO: add test
      const validatorPubkeysFeeRecipients = new Map();
      const validatorPubkeys =
        (await validatorApi.getRemoteKeys()).data.map(
          (keystore) => keystore.pubkey
        ) || [];
      for (const pubkey of validatorPubkeys) {
        const feeRecipient = await validatorApi.getFeeRecipient(pubkey);
        validatorPubkeysFeeRecipients.set(pubkey, feeRecipient.data.ethaddress);
      }
      // 4. DELETE from signer API pubkeys that are not in DB
      // TODO: add test
      const signerPubkeysToRemove = signerPubkeys.filter(
        (pubkey) => !(this.data as StakingBrainDb)[pubkey]
      );
      if (signerPubkeysToRemove.length > 0) {
        logger.debug(
          `Found ${signerPubkeysToRemove.length} validators to remove from signer`
        );
        await signerApi.deleteKeystores({ pubkeys: signerPubkeysToRemove });
        logger.debug(
          `Deleted ${signerPubkeysToRemove.length} validators from signer`
        );
      }
      // 5. DELETE from DB pubkeys that are not in signer API
      // TODO: add test
      const brainDbPubkeysToRemove = Object.keys(
        this.data as StakingBrainDb
      ).filter((pubkey) => !signerPubkeys.includes(pubkey));
      if (brainDbPubkeysToRemove.length > 0) {
        logger.debug(
          `Found ${brainDbPubkeysToRemove.length} validators to remove from DB`
        );
        this.deletePubkeys(brainDbPubkeysToRemove);
        logger.debug(
          `Deleted ${brainDbPubkeysToRemove.length} validators from DB`
        );
      }
      // 6. POST to validator API pubkeys that are in DB and not in validator API
      // TODO: add test
      const brainDbPubkeysToAdd = Object.keys(
        this.data as StakingBrainDb
      ).filter((pubkey) => !validatorPubkeys.includes(pubkey));
      if (brainDbPubkeysToAdd.length > 0) {
        logger.debug(
          `Found ${brainDbPubkeysToAdd.length} validators to add to validator API`
        );
        await validatorApi.postRemoteKeys({
          remote_keys: brainDbPubkeysToAdd.map((pubkey) => ({
            pubkey,
            url: signerUrl,
          })),
        });
        logger.debug(
          `Added ${brainDbPubkeysToAdd.length} validators to validator API`
        );
      }
      // 7. DELETE to validator API pubkeys that are in validator API and not in DB
      // TODO: add test
      const validatorPubkeysToRemove = validatorPubkeys.filter(
        (pubkey) => !(this.data as StakingBrainDb)[pubkey]
      );
      if (validatorPubkeysToRemove.length > 0) {
        logger.debug(
          `Found ${validatorPubkeysToRemove.length} validators to remove from validator API`
        );
        await validatorApi.deleteRemoteKeys({
          pubkeys: validatorPubkeysToRemove,
        });
        logger.debug(
          `Removed ${validatorPubkeysToRemove.length} validators from validator API`
        );
      }
      // 8. POST to validator API fee recipients that are in DB and not in validator API
      // TODO: add test
      const brainDbPubkeysFeeRecipientsToAdd = Array.from(
        validatorPubkeysFeeRecipients.entries()
      ).filter(
        ([pubkey, feeRecipient]) =>
          ((this.data as StakingBrainDb)[pubkey] as StakingBrainDb) &&
          (this.data as StakingBrainDb)[pubkey].feeRecipient !== feeRecipient
      );
      if (brainDbPubkeysFeeRecipientsToAdd.length > 0) {
        logger.debug(
          `Found ${brainDbPubkeysFeeRecipientsToAdd.length} fee recipients to add to validator API`
        );
        for (const [pubkey, feeRecipient] of brainDbPubkeysFeeRecipientsToAdd)
          await validatorApi
            .setFeeRecipient(feeRecipient, pubkey)
            .then(() => {
              (this.data as StakingBrainDb)[pubkey].feeRecipient = feeRecipient;
              this.write();
              logger.debug(
                `Added fee recipient ${feeRecipient} to validator API for pubkey ${pubkey}`
              );
            })
            .catch((e) =>
              logger.error(
                `Error adding fee recipient ${feeRecipient} to validator API for pubkey ${pubkey}`,
                e
              )
            );
      }
      logger.info(`Finished reloading data`);
    } catch (e) {
      logger.error(`Error reloading data`, e);
      // TODO: handle all possible errors:
      /**
     * ERROR PKG not installed (addr not found)
      ```
      Error: getaddrinfo ENOTFOUND validator.lighthouse-prater.dappnode
        at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:107:26) {
        errno: -3008,
        code: 'ENOTFOUND',
        syscall: 'getaddrinfo',
        hostname: 'validator.lighthouse-prater.dappnode'
        }
       ```

      * ERROR brain host not authorized
       ```
       { message: 'Host not authorized.' }
       ```
     */
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
      if (
        pubkeys.length !== tags.length ||
        pubkeys.length !== feeRecipients.length
      )
        throw Error(
          `Pubkeys, tags and fee recipients must have the same length`
        );

      const pubkeyDetails = this.buildPubkeysDetails(
        pubkeys,
        tags,
        feeRecipients
      );
      this.validateDb();
      // Remove pubkeys that already exist and add 0x prefix if needed
      if (this.data)
        for (const pubkey of Object.keys(pubkeyDetails)) {
          if (this.data[pubkey]) {
            logger.warn(`Pubkey ${pubkey} already in the database`);
            delete pubkeyDetails[pubkey];
          } else if (!pubkey.startsWith("0x")) {
            pubkeyDetails[`0x${pubkey}`] = pubkeyDetails[pubkey];
            delete pubkeyDetails[pubkey];
          }
        }

      this.ensureDbMaxSize(pubkeyDetails);
      this.validatePubkeys(pubkeyDetails);
      this.data = { ...this.data, ...pubkeyDetails };
      this.write();
    } catch (e) {
      e.message += `Unable to add pubkeys ${Object.keys(pubkeys).join(", ")}`;
      throw Error(e);
    }
  }

  /**
   * Updates 1 or more public keys details from the database
   */
  public updatePubkeys({
    pubkeys,
    tags,
    feeRecipients,
  }: {
    pubkeys: string[];
    tags: Tag[];
    feeRecipients: string[];
  }): void {
    try {
      if (
        pubkeys.length !== tags.length ||
        pubkeys.length !== feeRecipients.length
      )
        throw Error(
          `Pubkeys, tags and fee recipients must have the same length`
        );

      const pubkeyDetails = this.buildPubkeysDetails(
        pubkeys,
        tags,
        feeRecipients
      );
      this.validateDb();
      this.validatePubkeys(pubkeyDetails);
      if (this.data)
        for (const pubkey of Object.keys(pubkeyDetails)) {
          if (!this.data[pubkey]) {
            // Remove pubkeys that don't exist
            logger.warn(`Pubkey ${pubkey} not found in the database`);
            delete pubkeyDetails[pubkey];
          } else {
            this.data[pubkey].tag = pubkeyDetails[pubkey].tag;
            this.data[pubkey].feeRecipient = pubkeyDetails[pubkey].feeRecipient;
          }
        }

      this.write();
    } catch (e) {
      e.message += `Unable to update pubkeys ${Object.keys(pubkeys).join(
        ", "
      )}`;
      throw e;
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
      e.message += `Unable to delete pubkeys ${Object.keys(pubkeys).join(
        ", "
      )}`;
      throw e;
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
      e.message += `Unable to prune database. Creating a new one...`;
      logger.error(e);
      if (fs.existsSync(this.dbName)) fs.unlinkSync(this.dbName);
      this.createJsonFile();
    }
  }

  // Utils

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
      e.message += `The database is corrupted. Cleaning database`;
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
    validatorApi: ValidatorApi,
    defaultFeeRecipient: string
  ): Promise<void> {
    try {
      // Create json file
      this.createJsonFile();
      // Add permissions
      this.setOwnerWriteRead();
      // Fetch public keys from signer API
      // TODO: implement a retry system
      const pubkeys = (await signerApi.getKeystores()).data.map(
        (keystore) => keystore.validating_pubkey
      );
      if (pubkeys.length === 0) {
        logger.info(`No public keys found in the signer API`);
        return;
      }

      let feeRecipient = "";
      await validatorApi
        .getFeeRecipient(pubkeys[0])
        .then((response) => {
          feeRecipient = response.data.ethaddress;
        })
        .catch((e) => {
          logger.error(
            `Unable to fetch fee recipient for ${pubkeys[0]}. Setting default ${defaultFeeRecipient}}`,
            e
          );
          feeRecipient = defaultFeeRecipient;
        });

      const defaultTag = "solo";

      this.addPubkeys({
        pubkeys,
        tags: Array(pubkeys.length).fill(defaultTag),
        feeRecipients: Array(pubkeys.length).fill(feeRecipient),
      });
    } catch (e) {
      e.message += `Unable to perform database migration`;
      throw e;
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
      if (!isValidBlsPubkey(pubkey))
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
        if (!isValidTag(pubkeyDetails.tag))
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
        if (!isValidEcdsaPubkey(pubkeyDetails.feeRecipient))
          errors.push(`\n  pubkey ${pubkey}: fee recipient is invalid`);
      }

      // FeeRecipientValidator (it may be empty)
      if (pubkeyDetails.feeRecipientValidator) {
        if (typeof pubkeyDetails.feeRecipientValidator !== "string")
          errors.push(
            `\n  pubkey ${pubkey}: feeRecipientValidator address is invalid, must be in string format`
          );
        if (!isValidEcdsaPubkey(pubkeyDetails.feeRecipientValidator))
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
}

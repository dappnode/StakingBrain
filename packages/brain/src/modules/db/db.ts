import { StakingBrainDb } from "@stakingbrain/common";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";

// TODO:
// This db is not meant for large JavaScript objects (~10-100MB)
// The db must be created right after the migration
// The db must have a initial check and maybe should be added on every function to check whenever it is corrupted or not. It should be validated with a JSON schema
// Proper handling of errors

class BrainDataBase extends LowSync<StakingBrainDb> {
  constructor(dbName: string) {
    // JSONFileSync adapters will set db.data to null if file dbName doesn't exist.
    super(new JSONFileSync<StakingBrainDb>(dbName));
  }

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

  /**
   * Adds 1 or more public keys and their details to the database
   * @param pubkeys - object containing the public keys and their details
   * ```
   * {
   *  "pubkey1": {
   *   "tag": "obol",
   *   "feeRecipient": "0x1234567890",
   *   "feeRecipientValidator": "0x123456
   *   "automaticImport": true
   *   },
   * }
   */
  public addPubkeys(pubkeys: StakingBrainDb): void {
    this.ensurePubkeysDetailsExistAndAreValid(pubkeys);
    this.data = { ...this.data, ...pubkeys };
    this.write();
  }

  /**
   * Deletes 1 or more public keys and its details from the database
   * @param pubkeys - The public keys to delete
   */
  public deletePubkeys(pubkeys: string[]): void {
    if (this.data) {
      for (const pubkey of pubkeys) delete this.data[pubkey];
      this.write();
    }
  }

  /**
   * Cleans the database
   */
  public deleteDatabase(): void {
    this.data = {};
    this.write();
  }

  private ensurePubkeysDetailsExistAndAreValid(pubkeys: StakingBrainDb): void {
    const errors: string[] = [];
    Object.keys(pubkeys).forEach((key) => {
      // Pubkey details object exists
      if (!pubkeys[key]) {
        errors.push(`\nKey ${key}: Pubkey details are missing`);
        return;
      }

      // Details exist
      if (!pubkeys[key].tag) errors.push(`\n  Key ${key}: tag is missing`);
      if (!pubkeys[key].feeRecipient)
        errors.push(`\n  Key ${key}: feeRecipient is missing`);
      if (!pubkeys[key].feeRecipientValidator)
        errors.push(`\n  Key ${key}: feeRecipientValidator is missing`);
      if (typeof pubkeys[key].automaticImport === "undefined")
        errors.push(`\n  Key ${key}: automaticImport is missing`);

      // Details are in valid format
      if (typeof pubkeys[key].tag !== "string")
        errors.push(`\n  Key ${key}: tag is invalid, must be in string format`);
      if (typeof pubkeys[key].feeRecipient !== "string")
        errors.push(
          `\n  Key ${key}: feeRecipient is invalid, must be in string format`
        );
      if (typeof pubkeys[key].feeRecipientValidator !== "string")
        errors.push(
          `\n  Key ${key}: feeRecipientValidator validator is invalid, must be in string format`
        );
      if (typeof pubkeys[key].automaticImport !== "boolean")
        errors.push(
          `\n  Key ${key}: automaticImport is invalid, must be in boolean format`
        );
    });

    if (errors.length > 0) throw Error(errors.join(""));
  }
}

export const brainDb = new BrainDataBase(`brain-db.json`);

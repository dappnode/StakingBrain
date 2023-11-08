import { StakingBrainDb } from "@stakingbrain/common";
import { ApiError } from "../apiClients/error.js";
import { ValidatorApi } from "../apiClients/validator/index.js";
import { Web3SignerApi } from "../apiClients/web3signer/index.js";
import { BrainDataBase } from "../db/index.js";
import logger from "../logger/index.js";

export class Cron {
  private defaultInterval: number;
  private timer: NodeJS.Timer | undefined;
  private signerApi: Web3SignerApi;
  private signerUrl: string;
  private validatorApi: ValidatorApi;
  private brainDb: BrainDataBase;

  constructor(
    defaultInterval: number,
    signerApi: Web3SignerApi,
    signerUrl: string,
    validatorApi: ValidatorApi,
    brainDb: BrainDataBase
  ) {
    this.defaultInterval = defaultInterval;
    logger.debug(
      `Cron initialized with interval: ${defaultInterval / 1000} seconds`
    );
    this.signerApi = signerApi;
    this.signerUrl = signerUrl;
    this.validatorApi = validatorApi;
    this.brainDb = brainDb;
  }

  public start(interval?: number): void {
    logger.debug(`Starting cron...`);
    this.timer = setInterval(async () => {
      await this.reloadValidators();
    }, interval || this.defaultInterval);
  }

  public stop(): void {
    logger.debug(`Stopping cron...`);
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  public restart(): void {
    this.stop();
    this.start();
  }

  /**
   * Reload db data based on truth sources: validator and signer APIs:
   * - GET signer API pubkeys
   * - GET validator API pubkeys and fee recipients
   * - DELETE from signer API pubkeys that are not in DB
   * - DELETE from DB pubkeys that are not in signer API
   * - DELETE to validator API pubkeys that are in validator API and not in DB
   * - POST to validator API fee recipients that are in DB and not in validator API
   *
   */
  public async reloadValidators(): Promise<void> {
    try {
      logger.debug(`Reloading data...`);

      // 0. GET status
      const signerApiStatus = await this.signerApi.getStatus();

      // If web3signer API is not UP, skip data reload and further steps.
      // This is done to avoid unintended DB modifications when the API is down.
      // Status can be "UP" | "DOWN" | "UNKNOWN" | "LOADING" | "ERROR";
      if (signerApiStatus.status !== "UP") {
        logger.warn(`Web3Signer is ${signerApiStatus.status}. Skipping data reload until Web3Signer is UP. Trying again in ${this.defaultInterval / 1000} seconds`);
        return;
      }

      // 1. GET data
      const dbPubkeys = Object.keys(this.brainDb.getData());
      const signerPubkeys = (await this.signerApi.getKeystores()).data.map(
        (keystore) => keystore.validating_pubkey
      );

      // 2. DELETE from signer API pubkeys that are not in DB
      await this.deleteSignerPubkeysNotInDB({ signerPubkeys, dbPubkeys });

      // 3. DELETE from DB pubkeys that are not in signer API
      await this.deleteDbPubkeysNotInSigner({ dbPubkeys, signerPubkeys });

      const validatorPubkeys = (
        await this.validatorApi.getRemoteKeys()
      ).data.map((keystore) => keystore.pubkey);

      // 4. POST to validator API pubkeys that are in DB and not in validator API
      await this.postValidatorPubkeysFromDb({
        brainDbPubkeysToAdd: dbPubkeys.filter(
          (pubkey) => !validatorPubkeys.includes(pubkey)
        ),
        validatorPubkeys,
      });

      // 5. DELETE to validator API pubkeys that are in validator API and not in DB
      await this.deleteValidatorPubkeysNotInDB({
        validatorPubkeys,
        validatorPubkeysToRemove: validatorPubkeys.filter(
          (pubkey) => !dbPubkeys.includes(pubkey)
        ),
      });

      // 6. POST to validator API fee recipients that are in DB and not in validator API
      await this.postValidatorsFeeRecipientsFromDb({
        dbData: this.brainDb.getData(),
        validatorPubkeysFeeRecipients: await this.getValidatorsFeeRecipients({
          validatorPubkeys,
        }),
      });

      logger.debug(`Finished reloading data`);
    } catch (e) {
      if (e instanceof ApiError && e.code) {
        switch (e.code) {
          case "ECONNREFUSED":
            e.message += `Connection refused by the server ${e.hostname}. Make sure the port is open and the server is running`;
            break;
          case "ECONNRESET":
            e.message += `Connection reset by the server ${e.hostname}, check server logs`;
            break;
          case "ENOTFOUND":
            e.message += `Host ${e.hostname} not found. Make sure the server is running and the hostname is correct`;
            break;
          case "ERR_HTTP":
            e.message += `HTTP error code ${e.errno}`;
            break;
          default:
            e.message += `Unknown error`;
            break;
        }

        logger.error(`Error reloading data`, e);
      } else {
        logger.error(`Unknown error reloading data`, e);
      }
    }
  }

  /**
   * Get the validators fee recipients from the validator API for the given pubkeys
   */
  private async getValidatorsFeeRecipients({
    validatorPubkeys,
  }: {
    validatorPubkeys: string[];
  }): Promise<{ pubkey: string; feeRecipient: string }[]> {
    const validatorData = [];

    for (const pubkey of validatorPubkeys) {
      validatorData.push({
        pubkey,
        feeRecipient: (await this.validatorApi.getFeeRecipient(pubkey)).data
          .ethaddress,
      });
    }

    return validatorData;
  }

  /**
   * Delete from the validator API the pubkeys that are in the validator API and not in the DB
   */
  private async deleteSignerPubkeysNotInDB({
    signerPubkeys,
    dbPubkeys,
  }: {
    signerPubkeys: string[];
    dbPubkeys: string[];
  }): Promise<void> {
    const signerPubkeysToRemove = signerPubkeys.filter(
      (pubkey) => !dbPubkeys.includes(pubkey)
    );

    if (signerPubkeysToRemove.length > 0) {
      logger.debug(
        `Found ${signerPubkeysToRemove.length} validators to remove from signer`
      );

      const signerDeleteResponse = await this.signerApi.deleteKeystores({
        pubkeys: signerPubkeysToRemove,
      });

      for (const [index, pubkeyToRemove] of signerPubkeysToRemove.entries()) {
        const signerDeleteStatus = signerDeleteResponse.data[index].status;
        if (
          signerDeleteStatus === "deleted" ||
          signerDeleteStatus === "not_found"
        )
          signerPubkeys.splice(signerPubkeys.indexOf(pubkeyToRemove), 1);
        else
          logger.error(
            `Error deleting pubkey ${pubkeyToRemove} from signer API: ${signerDeleteResponse.data[index].message}`
          );
      }
    }
  }

  /**
   * Delete from the signer API the pubkeys that are in the DB and not in the signer API
   */
  private async deleteDbPubkeysNotInSigner({
    dbPubkeys,
    signerPubkeys,
  }: {
    dbPubkeys: string[];
    signerPubkeys: string[];
  }): Promise<void> {
    const dbPubkeysToRemove = dbPubkeys.filter(
      (pubkey) => !signerPubkeys.includes(pubkey)
    );

    if (dbPubkeysToRemove.length > 0) {
      logger.debug(
        `Found ${dbPubkeysToRemove.length} validators to remove from DB`
      );
      this.brainDb.deleteValidators(dbPubkeysToRemove);
      dbPubkeys.splice(
        0,
        dbPubkeys.length,
        ...dbPubkeys.filter((pubkey) => !dbPubkeysToRemove.includes(pubkey))
      );
    }
  }

  /**
   * Post pubkeys that are in the DB and not in the validator API
   */
  private async postValidatorPubkeysFromDb({
    brainDbPubkeysToAdd,
    validatorPubkeys,
  }: {
    brainDbPubkeysToAdd: string[];
    validatorPubkeys: string[];
  }): Promise<void> {
    if (brainDbPubkeysToAdd.length > 0) {
      logger.debug(
        `Found ${brainDbPubkeysToAdd.length} validators to add to validator API`
      );
      const postKeysResponse = await this.validatorApi.postRemoteKeys({
        remote_keys: brainDbPubkeysToAdd.map((pubkey) => ({
          pubkey,
          url: this.signerUrl,
        })),
      });

      for (const [index, pubkeyToAdd] of brainDbPubkeysToAdd.entries()) {
        const postKeyStatus = postKeysResponse.data[index].status;
        if (postKeyStatus === "imported" || postKeyStatus === "duplicate")
          validatorPubkeys.push(pubkeyToAdd);
        else
          logger.error(
            `Error adding pubkey ${pubkeyToAdd} to validator API: ${postKeyStatus} ${postKeysResponse.data[index].message}`
          );
      }
    }
  }

  /**
   * Delete from the validator API the pubkeys that are in the validator API and not in the DB
   */
  private async deleteValidatorPubkeysNotInDB({
    validatorPubkeys,
    validatorPubkeysToRemove,
  }: {
    validatorPubkeys: string[];
    validatorPubkeysToRemove: string[];
  }): Promise<void> {
    if (validatorPubkeysToRemove.length > 0) {
      logger.debug(
        `Found ${validatorPubkeysToRemove.length} validators to remove from validator API`
      );

      const deleteValidatorKeysResponse =
        await this.validatorApi.deleteRemoteKeys({
          pubkeys: validatorPubkeysToRemove,
        });

      for (const [
        index,
        pubkeyToRemove,
      ] of validatorPubkeysToRemove.entries()) {
        const deleteValidatorKeyStatus =
          deleteValidatorKeysResponse.data[index].status;

        if (
          deleteValidatorKeyStatus === "deleted" ||
          deleteValidatorKeyStatus === "not_found"
        )
          validatorPubkeys.splice(validatorPubkeys.indexOf(pubkeyToRemove), 1);
        else
          logger.error(
            `Error deleting pubkey ${pubkeyToRemove} from validator API: ${deleteValidatorKeyStatus} ${deleteValidatorKeysResponse.data[index].message}`
          );
      }
    }
  }

  /**
   * Post in the validator API fee recipients that are in the DB and not in the validator API
   */
  private async postValidatorsFeeRecipientsFromDb({
    dbData,
    validatorPubkeysFeeRecipients,
  }: {
    dbData: StakingBrainDb;
    validatorPubkeysFeeRecipients: { pubkey: string; feeRecipient: string }[];
  }): Promise<void> {
    const feeRecipientsToPost = validatorPubkeysFeeRecipients
      .filter(
        (validator) =>
          validator.feeRecipient !== dbData[validator.pubkey].feeRecipient
      )
      .map((validator) => ({
        pubkey: validator.pubkey,
        feeRecipient: dbData[validator.pubkey].feeRecipient,
      }));

    if (feeRecipientsToPost.length > 0) {
      logger.debug(
        `Found ${feeRecipientsToPost.length} fee recipients to add/update to validator API`
      );
      for (const { pubkey, feeRecipient } of feeRecipientsToPost)
        await this.validatorApi
          .setFeeRecipient(feeRecipient, pubkey)
          .catch((e) =>
            logger.error(
              `Error adding fee recipient ${feeRecipient} to validator API for pubkey ${pubkey}`,
              e
            )
          );
    }
  }
}

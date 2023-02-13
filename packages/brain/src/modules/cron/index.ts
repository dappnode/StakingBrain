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
   * TODO: this function is critical, it must have strict tests
   */
  public async reloadValidators(): Promise<void> {
    try {
      logger.info(`Reloading data...`);

      // 1. DELETE from signer API pubkeys that are not in DB
      let dbPubkeys = Object.keys(this.brainDb.getData());

      let signerPubkeys = (await this.signerApi.getKeystores()).data.map(
        (keystore) => keystore.validating_pubkey
      );

      signerPubkeys = await this.deleteSignerPubkeysNotInDB(
        signerPubkeys,
        dbPubkeys
      );

      // 2. DELETE from DB pubkeys that are not in signer API
      dbPubkeys = await this.deleteDbPubkeysNotInSigner(
        dbPubkeys,
        signerPubkeys
      );

      // 3. POST to validator API pubkeys that are in DB and not in validator API
      let validatorPubkeys =
        (await this.validatorApi.getRemoteKeys()).data.map(
          (keystore) => keystore.pubkey
        ) || [];

      validatorPubkeys = await this.postDbPubkeysNotInValidator(
        dbPubkeys,
        validatorPubkeys
      );

      // 5. DELETE to validator API pubkeys that are in validator API and not in DB
      validatorPubkeys = await this.deleteValidatorPubkeysNotInDB(
        validatorPubkeys,
        dbPubkeys
      );

      // 6. POST to validator API fee recipients that are in DB and not in validator API
      const validatorPubkeysFeeRecipients =
        await this.getFeeRecipientsForPubkeysFromValidator(validatorPubkeys);

      const dbData = this.brainDb.getData();

      await this.postValidatorFeeRecipientsNotInValidator(
        dbData,
        validatorPubkeysFeeRecipients
      );

      logger.info(`Finished reloading data`);
    } catch (e) {
      if (e instanceof ApiError && e.code) {
        switch (e.code) {
          case "ECONNREFUSED":
            e.message += `Connection refused by the server ${e.hostname}. Make sure the port is open and the server is running`;
            break;
          case "ECONNRESET":
            e.message += `Connection reset by the server ${e.hostname}, check server logs`;
            break;
          case "ENNOTFOUND":
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
      }
    }
  }

  private async getFeeRecipientsForPubkeysFromValidator(
    validatorPubkeys: string[]
  ): Promise<{ pubkey: string; feeRecipient: string }[]> {
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

  private async deleteSignerPubkeysNotInDB(
    signerPubkeys: string[],
    dbPubkeys: string[]
  ): Promise<string[]> {
    const signerPubkeysToRemove = signerPubkeys.filter(
      (pubkey) => !dbPubkeys.includes(pubkey)
    );

    let removedPubkeys = 0;

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
        ) {
          //Remove that pubkey from signerPubkeys
          signerPubkeys.splice(signerPubkeys.indexOf(pubkeyToRemove), 1);
        } else {
          logger.error(
            `Error deleting pubkey ${pubkeyToRemove} from signer API: ${signerDeleteResponse.data[index].message}`
          );
          removedPubkeys--;
        }
      }

      logger.debug(`Deleted ${removedPubkeys} validators from signer`);
    }

    return signerPubkeys;
  }

  private async deleteDbPubkeysNotInSigner(
    dbPubkeys: string[],
    signerPubkeys: string[]
  ) {
    const dbPubkeysToRemove = dbPubkeys.filter(
      (pubkey) => !signerPubkeys.includes(pubkey)
    );

    if (dbPubkeysToRemove.length > 0) {
      logger.debug(
        `Found ${dbPubkeysToRemove.length} validators to remove from DB`
      );

      try {
        this.brainDb.deleteValidators(dbPubkeysToRemove);
        logger.debug(`Deleted ${dbPubkeysToRemove.length} validators from DB`);
      } catch (e) {
        logger.error(`Error deleting validators from DB`, e);
      }
    }

    //Return dbPubkeys without the ones that were deleted
    return dbPubkeys.filter((pubkey) => !dbPubkeysToRemove.includes(pubkey));
  }

  private async postDbPubkeysNotInValidator(
    dbPubkeys: string[],
    validatorPubkeys: string[]
  ): Promise<string[]> {
    const brainDbPubkeysToAdd = dbPubkeys.filter(
      (pubkey) => !validatorPubkeys.includes(pubkey)
    );

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
        if (postKeyStatus === "imported" || postKeyStatus === "duplicate") {
          //Add that pubkey to validatorPubkeys
          validatorPubkeys.push(pubkeyToAdd);
        } else {
          logger.error(
            `Error adding pubkey ${pubkeyToAdd} to validator API: ${postKeysResponse.data[index].message}`
          );
        }
      }

      logger.debug(
        `Added ${brainDbPubkeysToAdd.length} validators to validator API`
      );
    }

    return validatorPubkeys;
  }

  private async deleteValidatorPubkeysNotInDB(
    validatorPubkeys: string[],
    dbPubkeys: string[]
  ): Promise<string[]> {
    const validatorPubkeysToRemove = validatorPubkeys.filter(
      (pubkey) => !dbPubkeys.includes(pubkey)
    );

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
        ) {
          //Remove that pubkey from validatorPubkeys
          validatorPubkeys.splice(validatorPubkeys.indexOf(pubkeyToRemove), 1);
        } else {
          logger.error(
            `Error deleting pubkey ${pubkeyToRemove} from validator API: ${deleteValidatorKeysResponse.data[index].message}`
          );
        }

        logger.debug(
          `Removed ${validatorPubkeysToRemove.length} validators from validator API`
        );
      }
    }

    return validatorPubkeys.filter(
      (pubkey) => !validatorPubkeysToRemove.includes(pubkey)
    );
  }

  private async postValidatorFeeRecipientsNotInValidator(
    dbData: StakingBrainDb,
    validatorPubkeysFeeRecipients: { pubkey: string; feeRecipient: string }[]
  ) {
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
        `Found ${feeRecipientsToPost.length} fee recipients to add to validator API`
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

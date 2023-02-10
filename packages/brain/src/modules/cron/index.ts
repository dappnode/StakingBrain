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
    logger.debug(`Reloading validators...`);
    //TODO perform reload from this class instead of brainDb
    try {
      logger.info(`Reloading data...`);
      // 1. Read DB (pubkeys, fee recipients, tags)
      this.brainDb.read();
      if (!this.brainDb.data) logger.warn(`Database is empty`);
      // 2. GET signer API pubkeys
      const signerPubkeys = (await this.signerApi.getKeystores()).data.map(
        (keystore) => keystore.validating_pubkey
      );
      // 3. GET validator API pubkeys and fee recipients
      const validatorPubkeysFeeRecipients = new Map();
      const validatorPubkeys =
        (await this.validatorApi.getRemoteKeys()).data.map(
          (keystore) => keystore.pubkey
        ) || [];
      for (const pubkey of validatorPubkeys) {
        const feeRecipient = await this.validatorApi.getFeeRecipient(pubkey);
        validatorPubkeysFeeRecipients.set(pubkey, feeRecipient.data.ethaddress);
      }
      // 4. DELETE from signer API pubkeys that are not in DB
      const signerPubkeysToRemove = signerPubkeys.filter(
        (pubkey) => !(this.brainDb.data as StakingBrainDb)[pubkey]
      );
      if (signerPubkeysToRemove.length > 0) {
        logger.debug(
          `Found ${signerPubkeysToRemove.length} validators to remove from signer`
        );
        await this.signerApi.deleteKeystores({
          pubkeys: signerPubkeysToRemove,
        });
        logger.debug(
          `Deleted ${signerPubkeysToRemove.length} validators from signer`
        );
      }
      // 5. DELETE from DB pubkeys that are not in signer API
      const brainDbPubkeysToRemove = Object.keys(
        this.brainDb.data as StakingBrainDb
      ).filter((pubkey) => !signerPubkeys.includes(pubkey));
      if (brainDbPubkeysToRemove.length > 0) {
        logger.debug(
          `Found ${brainDbPubkeysToRemove.length} validators to remove from DB`
        );
        this.brainDb.deleteValidators(brainDbPubkeysToRemove);
        logger.debug(
          `Deleted ${brainDbPubkeysToRemove.length} validators from DB`
        );
      }
      // 6. POST to validator API pubkeys that are in DB and not in validator API
      const brainDbPubkeysToAdd = Object.keys(
        this.brainDb.data as StakingBrainDb
      ).filter((pubkey) => !validatorPubkeys.includes(pubkey));
      if (brainDbPubkeysToAdd.length > 0) {
        logger.debug(
          `Found ${brainDbPubkeysToAdd.length} validators to add to validator API`
        );
        await this.validatorApi.postRemoteKeys({
          remote_keys: brainDbPubkeysToAdd.map((pubkey) => ({
            pubkey,
            url: this.signerUrl,
          })),
        });
        logger.debug(
          `Added ${brainDbPubkeysToAdd.length} validators to validator API`
        );
      }
      // 7. DELETE to validator API pubkeys that are in validator API and not in DB
      const validatorPubkeysToRemove = validatorPubkeys.filter(
        (pubkey) => !(this.brainDb.data as StakingBrainDb)[pubkey]
      );
      if (validatorPubkeysToRemove.length > 0) {
        logger.debug(
          `Found ${validatorPubkeysToRemove.length} validators to remove from validator API`
        );
        await this.validatorApi.deleteRemoteKeys({
          pubkeys: validatorPubkeysToRemove,
        });
        logger.debug(
          `Removed ${validatorPubkeysToRemove.length} validators from validator API`
        );
      }
      // 8. POST to validator API fee recipients that are in DB and not in validator API
      const brainDbPubkeysFeeRecipientsToAdd = Array.from(
        validatorPubkeysFeeRecipients.entries()
      ).filter(
        ([pubkey, feeRecipient]) =>
          (this.brainDb.data as StakingBrainDb)[pubkey] &&
          (this.brainDb.data as StakingBrainDb)[pubkey].feeRecipient !==
            feeRecipient
      );
      if (brainDbPubkeysFeeRecipientsToAdd.length > 0) {
        logger.debug(
          `Found ${brainDbPubkeysFeeRecipientsToAdd.length} fee recipients to add to validator API`
        );
        for (const [pubkey, feeRecipient] of brainDbPubkeysFeeRecipientsToAdd)
          await this.validatorApi
            .setFeeRecipient(feeRecipient, pubkey)
            .then(() => {
              (this.brainDb.data as StakingBrainDb)[pubkey].feeRecipient =
                feeRecipient;
              this.brainDb.write();
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
}

import { ValidatorApi } from "../apiClients/validator/index.js";
import { Web3SignerApi } from "../apiClients/web3signer/index.js";
import { BrainDataBase } from "../db/index.js";
import logger from "../logger/index.js";

export class Cron {
  defaultInterval: number;
  timer: NodeJS.Timer | undefined;
  signerApi: Web3SignerApi;
  signerUrl: string;
  validatorApi: ValidatorApi;
  brainDb: BrainDataBase;

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

  public async reloadValidators(): Promise<void> {
    logger.debug(`Reloading validators...`);
    //TODO perform reload from this class instead of brainDb
    await this.brainDb.reloadValidators(
      this.signerApi,
      this.validatorApi,
      this.signerUrl
    );
  }
}

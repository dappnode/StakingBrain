import { StandardApi } from "../index.js";

export class BeaconChain extends StandardApi {
  private beaconchainEndpoint = "/eth/v1/beacon";

  /**
   * Submits SignedVoluntaryExit object to node's pool and if passes validation node MUST broadcast it to network.
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/submitPoolVoluntaryExit
   */
  public async postVoluntaryExits({
    pubkeys,
  }: {
    pubkeys: string[];
  }): Promise<void> {
    try {
      /**
       * The request body schema is defined as:
       * {
       *   "message": {
       *     "epoch": "1",
       *     "validator_index": "1"
       *   },
       *  "signature": "0x1b66ac1fb663c9bc59509846d6ec05345bd908eda73e670af888da41af171505cc411d61252fb6cb3fa0017b679f8bb2305b26a285fa2737f175668d0dff91cc1b66ac1fb663c9bc59509846d6ec05345bd908eda73e670af888da41af171505"
       * }
       */

      await this.request(
        "POST",
        `${this.beaconchainEndpoint}/pool/voluntary_exits`,
        JSON.stringify({ pubkeys })
      );
    } catch (e) {
      e.message += `Error posting (POST) voluntary exits to beaconchain. `;
      throw e;
    }
  }
}

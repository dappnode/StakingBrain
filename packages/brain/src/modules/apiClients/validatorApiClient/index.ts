import {
  ValidatorGetResponse,
  ValidatorPostResponse,
} from "@stakingbrain/common";

import { StandardApiClient } from "../StandardApiClient/index";

export default class ValidatorApiClient extends StandardApiClient {
  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getFeeRecipient(
    publicKey: string,
    tls: boolean = false
  ): Promise<ValidatorGetResponse> {
    try {
      return (await this.request(
        "GET",
        publicKey + "/feerecipient",
        tls
      )) as ValidatorGetResponse;
    } catch (e) {
      return {
        message: { message: e.message },
      };
    }
  }

  /**
   * Sets the validator client fee recipient mapping which will then update the beacon node..
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/setFeeRecipient
   */
  public async setFeeRecipient(
    newFeeRecipient: string,
    publicKey: string,
    tls: boolean = false
  ): Promise<ValidatorPostResponse> {
    try {
      return (await this.request(
        "POST",
        publicKey + "/feerecipient",
        tls,
        JSON.stringify({ ethaddress: newFeeRecipient })
      )) as ValidatorPostResponse;
    } catch (e) {
      return {
        message: {
          message: e.message,
        },
      };
    }
  }
}

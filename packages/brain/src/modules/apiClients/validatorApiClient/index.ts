import {
  ValidatorGetFeeResponse,
  ValidatorGetRemoteKeysResponse,
  ValidatorPostFeeResponse,
  ValidatorPostRemoteKeysResponse,
} from "@stakingbrain/common";

import { StandardApiClient } from "../index.js";

export class ValidatorApiClient extends StandardApiClient {
  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getFeeRecipient(
    publicKey: string,
    tls = false
  ): Promise<ValidatorGetFeeResponse> {
    try {
      return (await this.request(
        "GET",
        "/eth/v1/validator/" + publicKey + "/feerecipient",
        tls
      )) as ValidatorGetFeeResponse;
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
    tls = false
  ): Promise<ValidatorPostFeeResponse> {
    try {
      return (await this.request(
        "POST",
        "/eth/v1/validator/" + publicKey + "/feerecipient",
        tls,
        JSON.stringify({ ethaddress: newFeeRecipient })
      )) as ValidatorPostFeeResponse;
    } catch (e) {
      return {
        message: {
          message: e.message,
        },
      };
    }
  }

  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getRemoteKeys(
    tls = false
  ): Promise<ValidatorGetRemoteKeysResponse> {
    try {
      return (await this.request(
        "GET",
        "/eth/v1/remotekeys",
        tls
      )) as ValidatorGetRemoteKeysResponse;
    } catch (e) {
      return {
        message: { message: e.message },
      };
    }
  }
  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async postRemoteKeys(
    tls = false
  ): Promise<ValidatorPostRemoteKeysResponse> {
    try {
      return (await this.request(
        "POST",
        "/eth/v1/remotekeys",
        tls
      )) as ValidatorPostRemoteKeysResponse;
    } catch (e) {
      return {
        message: { message: e.message },
      };
    }
  }
}

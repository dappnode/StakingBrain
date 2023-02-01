import {
  ValidatorGetFeeResponse,
  ValidatorGetRemoteKeysResponse,
  ValidatorPostFeeResponse,
  ValidatorPostRemoteKeysResponse,
} from "@stakingbrain/common";

import { StandardApi } from "../index.js";

export class ValidatorApi extends StandardApi {
  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getFeeRecipient(
    publicKey: string
  ): Promise<ValidatorGetFeeResponse> {
    try {
      return (await this.request(
        "GET",
        "/eth/v1/validator/" + publicKey + "/feerecipient"
      )) as ValidatorGetFeeResponse;
    } catch (e) {
      throw Error(
        `Error getting (GET) fee recipient for ${publicKey} from ${this.requestOptions.hostname}: ${e}`
      );
    }
  }

  /**
   * Sets the validator client fee recipient mapping which will then update the beacon node..
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/setFeeRecipient
   */
  public async setFeeRecipient(
    newFeeRecipient: string,
    publicKey: string
  ): Promise<ValidatorPostFeeResponse> {
    try {
      return (await this.request(
        "POST",
        "/eth/v1/validator/" + publicKey + "/feerecipient",
        JSON.stringify({ ethaddress: newFeeRecipient })
      )) as ValidatorPostFeeResponse;
    } catch (e) {
      throw Error(
        `Error setting (POST) fee recipient for ${publicKey} to ${newFeeRecipient} on ${this.requestOptions.hostname}: ${e}`
      );
    }
  }

  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getRemoteKeys(): Promise<ValidatorGetRemoteKeysResponse> {
    try {
      return (await this.request(
        "GET",
        "/eth/v1/remotekeys"
      )) as ValidatorGetRemoteKeysResponse;
    } catch (e) {
      throw Error(
        `Error getting (GET) remote keys from ${this.requestOptions.hostname}: ${e}`
      );
    }
  }
  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async postRemoteKeys(): Promise<ValidatorPostRemoteKeysResponse> {
    try {
      return (await this.request(
        "POST",
        "/eth/v1/remotekeys"
      )) as ValidatorPostRemoteKeysResponse;
    } catch (e) {
      throw Error(
        `Error posting (POST) remote keys to ${this.requestOptions.hostname}: ${e}`
      );
    }
  }
}

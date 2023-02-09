import {
  ValidatorDeleteRemoteKeysRequest,
  ValidatorDeleteRemoteKeysResponse,
  ValidatorGetFeeResponse,
  ValidatorGetRemoteKeysResponse,
  ValidatorPostRemoteKeysRequest,
  ValidatorPostRemoteKeysResponse,
  prefix0xPubkey,
} from "@stakingbrain/common";
import { StandardApi } from "../index.js";
import path from "path";

export class ValidatorApi extends StandardApi {
  /**
   * Remote Key Manager endpoint
   * @see https://ethereum.github.io/keymanager-APIs/#/Remote%20Key%20Manager
   */
  remoteKeymanagerEndpoint = "/eth/v1/remotekeys";

  /**
   * Fee recipient endpoint
   * @see https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient
   */
  feeRecipientEndpoint = "/eth/v1/validator";

  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * @see https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getFeeRecipient(
    publicKey: string
  ): Promise<ValidatorGetFeeResponse> {
    try {
      return (await this.request(
        "GET",
        path.join(
          this.feeRecipientEndpoint,
          prefix0xPubkey(publicKey),
          "feerecipient"
        )
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
  ): Promise<void> {
    try {
      await this.request(
        "POST",
        path.join(
          this.feeRecipientEndpoint,
          prefix0xPubkey(publicKey),
          "feerecipient"
        ),
        JSON.stringify({ ethaddress: newFeeRecipient })
      );
    } catch (e) {
      throw Error(
        `Error setting (POST) fee recipient for ${publicKey} to ${newFeeRecipient} on ${this.requestOptions.hostname}: ${e}`
      );
    }
  }

  /**
   * Removes the validator client fee recipient for a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/deleteFeeRecipient
   */
  public async deleteFeeRecipient(publicKey: string): Promise<void> {
    try {
      await this.request(
        "DELETE",
        path.join(
          this.feeRecipientEndpoint + prefix0xPubkey(publicKey) + "feerecipient"
        )
      );
    } catch (e) {
      throw Error(
        `Error removing (DELETE) fee recipient for ${publicKey} on ${this.requestOptions.hostname}: ${e}`
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
        this.remoteKeymanagerEndpoint
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
  public async postRemoteKeys(
    remoteKeys: ValidatorPostRemoteKeysRequest
  ): Promise<ValidatorPostRemoteKeysResponse> {
    try {
      // Make sure all pubkeys are prefixed with 0x
      remoteKeys.remote_keys = remoteKeys.remote_keys.map((k) => {
        return { pubkey: prefix0xPubkey(k.pubkey), url: k.url };
      });
      return (await this.request(
        "POST",
        this.remoteKeymanagerEndpoint,
        JSON.stringify(remoteKeys)
      )) as ValidatorPostRemoteKeysResponse;
    } catch (e) {
      throw Error(
        `Error posting (POST) remote keys to ${this.requestOptions.hostname}: ${e}`
      );
    }
  }

  /**
   * Delete the selected keys from the remote keystore in the validator client.
   * https://ethereum.github.io/keymanager-APIs/#/Remote%20Keystore/deleteRemoteKeys
   */
  public async deleteRemoteKeys(
    pubkeys: ValidatorDeleteRemoteKeysRequest
  ): Promise<ValidatorDeleteRemoteKeysResponse> {
    try {
      // Make sure all pubkeys are prefixed with 0x
      pubkeys.pubkeys = pubkeys.pubkeys.map((k) => prefix0xPubkey(k));
      return (await this.request(
        "DELETE",
        this.remoteKeymanagerEndpoint,
        JSON.stringify(pubkeys)
      )) as ValidatorDeleteRemoteKeysResponse;
    } catch (e) {
      throw Error(
        `Error deleting (DELETE) remote keys from ${this.requestOptions.hostname}: ${e}`
      );
    }
  }
}

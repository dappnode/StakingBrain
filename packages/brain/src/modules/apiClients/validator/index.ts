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
  private remoteKeymanagerEndpoint = "/eth/v1/remotekeys";

  /**
   * Fee recipient endpoint
   * @see https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient
   */
  private feeRecipientEndpoint = "/eth/v1/validator";

  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * @see https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getFeeRecipient(
    publicKey: string
  ): Promise<ValidatorGetFeeResponse> {
    try {
      return (await this.request({
        method: "GET",
        endpoint: path.join(
          this.feeRecipientEndpoint,
          prefix0xPubkey(publicKey),
          "feerecipient"
        )
      })) as ValidatorGetFeeResponse;
    } catch (e) {
      e.message += `Error getting (GET) fee recipient for pubkey ${publicKey} from validator. `;
      throw e;
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
      await this.request({
        method: "POST",
        endpoint: path.join(
          this.feeRecipientEndpoint,
          prefix0xPubkey(publicKey),
          "feerecipient"
        ),
        body: JSON.stringify({ ethaddress: newFeeRecipient })
      });
    } catch (e) {
      e.message += `Error setting (POST) fee recipient for pubkey ${publicKey} to ${newFeeRecipient} on validator. `;
      throw e;
    }
  }

  /**
   * Removes the validator client fee recipient for a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/deleteFeeRecipient
   */
  public async deleteFeeRecipient(publicKey: string): Promise<void> {
    try {
      await this.request({
        method: "DELETE",
        endpoint: path.join(
          this.feeRecipientEndpoint,
          prefix0xPubkey(publicKey),
          "feerecipient"
        )
      });
    } catch (e) {
      e.message += `Error deleting (DELETE) fee recipient for pubkey ${publicKey} from validator. `;
      throw e;
    }
  }

  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getRemoteKeys(): Promise<ValidatorGetRemoteKeysResponse> {
    try {
      return (await this.request({
        method: "GET",
        endpoint: this.remoteKeymanagerEndpoint
      })) as ValidatorGetRemoteKeysResponse;
    } catch (e) {
      e.message += `Error getting (GET) remote keys from validator. `;
      throw e;
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
      return (await this.request({
        method: "POST",
        endpoint: this.remoteKeymanagerEndpoint,
        body: JSON.stringify(remoteKeys)
      })) as ValidatorPostRemoteKeysResponse;
    } catch (e) {
      e.message += `Error posting (POST) remote keys to validator. `;
      throw e;
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
      return (await this.request({
        method: "DELETE",
        endpoint: this.remoteKeymanagerEndpoint,
        body: JSON.stringify(pubkeys)
      })) as ValidatorDeleteRemoteKeysResponse;
    } catch (e) {
      e.message += `Error deleting (DELETE) remote keys from validator. `;
      throw e;
    }
  }
}

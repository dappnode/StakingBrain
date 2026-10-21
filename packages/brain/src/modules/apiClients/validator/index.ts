import {
  ValidatorDeleteRemoteKeysRequest,
  ValidatorDeleteRemoteKeysResponse,
  ValidatorGetFeeResponse,
  ValidatorGetRemoteKeysResponse,
  ValidatorPostRemoteKeysRequest,
  ValidatorPostRemoteKeysResponse,
  ValidatorProposerDutiesGetResponse,
  ValidatorAttesterDutiesPostResponse
} from "./types.js";
import { StandardApi } from "../standard.js";
import path from "path";
import { prefix0xPubkey } from "../prefix0xPubkey.js";
import { ValidatorApiError } from "./error.js";
import { BuilderConfig, BuilderConfigStatus, isValidBlsPubkey, validateBuilderConfig } from "@stakingbrain/common";
import { HttpApiError } from "../error.js";

export class ValidatorApi extends StandardApi {
  // Same per-validator status/message reporting as the other Keymanager operations.
  // Transient: persisted desired configuration is always reapplied after a restart.
  private builderConfigStatuses = new Map<string, BuilderConfigStatus>();

  public getBuilderConfigStatus(publicKey: string): BuilderConfigStatus | undefined {
    return this.builderConfigStatuses.get(prefix0xPubkey(publicKey));
  }

  public async getBuilderConfig(publicKey: string, signal?: AbortSignal): Promise<{ data: BuilderConfig }> {
    try {
      const response = await this.request({
        method: "GET",
        endpoint: this.builderConfigEndpoint(publicKey),
        timeout: 10000,
        signal
      });
      validateBuilderConfig(response?.data);
      return response;
    } catch (e) {
      throw this.builderConfigError(e, "reading", publicKey);
    }
  }

  /** POST replaces overrides in full. Never feed resolved GET values back into this method. */
  public async setBuilderConfig(config: BuilderConfig, publicKey: string): Promise<void> {
    validateBuilderConfig(config);
    await this.applyBuilderConfig("POST", publicKey, config);
  }

  public async deleteBuilderConfig(publicKey: string): Promise<void> {
    await this.applyBuilderConfig("DELETE", publicKey);
  }

  private builderConfigEndpoint(publicKey: string): string {
    const pubkey = prefix0xPubkey(publicKey);
    if (!isValidBlsPubkey(pubkey)) throw new ValidatorApiError("Invalid builder configuration validator public key");
    return `${this.validatorEndpoint}/${pubkey}/builder_config`;
  }

  private async applyBuilderConfig(
    method: "POST" | "DELETE",
    publicKey: string,
    config?: BuilderConfig
  ): Promise<void> {
    const pubkey = prefix0xPubkey(publicKey);
    try {
      await this.request({
        method,
        endpoint: this.builderConfigEndpoint(pubkey),
        body: config === undefined ? undefined : JSON.stringify(config),
        timeout: 10000
      });
      this.builderConfigStatuses.set(pubkey, { status: "applied" });
    } catch (e) {
      const error = this.builderConfigError(e, method === "POST" ? "applying" : "resetting", pubkey);
      this.builderConfigStatuses.set(pubkey, {
        status: e instanceof HttpApiError && [405, 501].includes(e.statusCode) ? "unsupported" : "error",
        message: error.message
      });
      throw error;
    }
  }

  private builderConfigError(error: Error, action: string, pubkey: string): ValidatorApiError {
    // Do not expose response bodies: a client may echo stored authorization bytes.
    const reason =
      error instanceof HttpApiError
        ? `HTTP ${error.statusCode}${[405, 501].includes(error.statusCode) ? " (builder configuration is unsupported)" : error.statusCode === 404 ? " (endpoint unavailable or validator key not found)" : ""}`
        : error.message;
    return new ValidatorApiError(`Error ${action} builder configuration for ${pubkey}: ${reason}`);
  }

  /**
   * Remote Key Manager endpoint
   * @see https://ethereum.github.io/keymanager-APIs/#/Remote%20Key%20Manager
   */
  private remoteKeymanagerEndpoint = "/eth/v1/remotekeys";

  /**
   * Validator endpoint
   * @see https://ethereum.github.io/beacon-APIs/#/Validator
   */
  private validatorEndpoint = "/eth/v1/validator";

  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * @see https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async getFeeRecipient(publicKey: string): Promise<ValidatorGetFeeResponse> {
    try {
      return (await this.request({
        method: "GET",
        endpoint: path.join(this.validatorEndpoint, prefix0xPubkey(publicKey), "feerecipient")
      })) as ValidatorGetFeeResponse;
    } catch (e) {
      throw new ValidatorApiError(`Error getting fee recipient for pubkey ${publicKey} from validator. ${e.message}`);
    }
  }

  /**
   * Sets the validator client fee recipient mapping which will then update the beacon node..
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/setFeeRecipient
   */
  public async setFeeRecipient(newFeeRecipient: string, publicKey: string): Promise<void> {
    try {
      await this.request({
        method: "POST",
        endpoint: path.join(this.validatorEndpoint, prefix0xPubkey(publicKey), "feerecipient"),
        body: JSON.stringify({ ethaddress: newFeeRecipient })
      });
    } catch (e) {
      throw new ValidatorApiError(
        `Error setting fee recipient for pubkey ${publicKey} to ${newFeeRecipient} on validator. ${e.message}`
      );
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
        endpoint: path.join(this.validatorEndpoint, prefix0xPubkey(publicKey), "feerecipient")
      });
    } catch (e) {
      throw new ValidatorApiError(`Error deleting fee recipient for pubkey ${publicKey} from validator. ${e.message}`);
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
      throw new ValidatorApiError(`Error getting remote keys from validator. ${e.message}`);
    }
  }
  /**
   * List the validator public key to eth address mapping for fee recipient feature on a specific public key.
   * https://ethereum.github.io/keymanager-APIs/#/Fee%20Recipient/listFeeRecipient
   */
  public async postRemoteKeys(remoteKeys: ValidatorPostRemoteKeysRequest): Promise<ValidatorPostRemoteKeysResponse> {
    try {
      // Make sure all pubkeys are prefixed with 0x
      remoteKeys.remote_keys = remoteKeys.remote_keys.map((k) => {
        return { pubkey: prefix0xPubkey(k.pubkey), url: k.url };
      });
      const response = (await this.request({
        method: "POST",
        endpoint: this.remoteKeymanagerEndpoint,
        body: JSON.stringify(remoteKeys)
      })) as ValidatorPostRemoteKeysResponse;

      return this.toLowerCaseStatus(response);
    } catch (e) {
      throw new ValidatorApiError(`Error posting (POST) remote keys to validator. ${e.message}`);
    }
  }

  /**
   * Delete the selected keys from the remote keystore in the validator client.
   * https://ethereum.github.io/keymanager-APIs/#/Remote%20Keystore/deleteRemoteKeys
   */
  public async deleteRemoteKeys(pubkeys: ValidatorDeleteRemoteKeysRequest): Promise<ValidatorDeleteRemoteKeysResponse> {
    try {
      // Make sure all pubkeys are prefixed with 0x
      pubkeys.pubkeys = pubkeys.pubkeys.map((k) => prefix0xPubkey(k));
      const response = (await this.request({
        method: "DELETE",
        endpoint: this.remoteKeymanagerEndpoint,
        body: JSON.stringify(pubkeys)
      })) as ValidatorDeleteRemoteKeysResponse;

      return this.toLowerCaseStatus(response);
    } catch (e) {
      e.message += `Error deleting (DELETE) remote keys from validator. `;
      throw new ValidatorApiError(`Error deleting (DELETE) remote keys from validator. ${e.message}`);
    }
  }

  /**
   * Requests the beacon node to provide a set of attestation duties, which should be performed by validators, for a particular epoch.
   * Duties should only need to be checked once per epoch, however a chain reorganization (of > MIN_SEED_LOOKAHEAD epochs) could occur,
   * resulting in a change of duties. For full safety, you should monitor head events and confirm the dependent root in this response matches:
   *
   * - event.previous_duty_dependent_root when compute_epoch_at_slot(event.slot) == epoch
   * - event.current_duty_dependent_root when compute_epoch_at_slot(event.slot) + 1 == epoch
   * - event.block otherwise
   *
   * The dependent_root value is get_block_root_at_slot(state, compute_start_slot_at_epoch(epoch - 1) - 1) or the genesis block root in the case of underflow.
   *
   * @param validatorIndices - The indices of the validators to get attester duties for.
   * @param epoch - Should only be allowed 1 epoch ahead
   * @see https://ethereum.github.io/beacon-APIs/#/Validator/getAttesterDuties
   * @returns the attester duties for the given validator indices.
   */
  public async getAttesterDuties(
    validatorIndices: string[],
    epoch: string
  ): Promise<ValidatorAttesterDutiesPostResponse> {
    try {
      return await this.request({
        method: "POST",
        endpoint: path.join(this.validatorEndpoint, "duties", "attester", epoch),
        body: JSON.stringify(validatorIndices)
      });
    } catch (e) {
      e.message += `Error getting (POST) attester duties from validator. `;
      throw new ValidatorApiError(`Error getting (POST) attester duties from validator. ${e.message}`);
    }
  }

  /**
   * Request beacon node to provide all validators that are scheduled to propose a block in the given epoch. Duties should only need to be checked once per epoch, however a chain reorganization could occur that results in a change of duties. For full safety, you should monitor head events and confirm the dependent root in this response matches:
   *
   * event.current_duty_dependent_root when compute_epoch_at_slot(event.slot) == epoch
   * event.block otherwise
   * The dependent_root value is get_block_root_at_slot(state, compute_start_slot_at_epoch(epoch) - 1) or the genesis block root in the case of underflow.
   *
   * @see https://ethereum.github.io/beacon-APIs/#/Validator/getProposerDuties
   * @param epoch - The epoch to get proposer duties for.
   * @returns the proposer duties for the given epoch.
   */
  public async getProposerDuties(epoch: string): Promise<ValidatorProposerDutiesGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.validatorEndpoint, "duties", "proposer", epoch)
      });
    } catch (e) {
      throw new ValidatorApiError(`Error getting (GET) proposer duties from validator. ${e.message}`);
    }
  }

  // Utils

  /**
   * Converts the status to lowercase for Web3SignerPostResponse and Web3SignerDeleteResponse
   */
  private toLowerCaseStatus<T extends ValidatorPostRemoteKeysResponse | ValidatorDeleteRemoteKeysResponse>(
    validatorResponse: T
  ): T {
    return {
      ...validatorResponse,
      data: validatorResponse.data.map((item) => ({
        ...item,
        status: item.status.toLowerCase()
      }))
    } as T;
  }
}

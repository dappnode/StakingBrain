import {
  Web3signerPostRequest,
  Web3signerPostResponse,
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerHealthcheckResponse,
  prefix0xPubkey,
  Web3SignerPostSignvoluntaryexitRequest,
  Web3SignerPostSignvoluntaryexitResponse,
} from "@stakingbrain/common";
import { StandardApi } from "../index.js";
import path from "node:path";

/**
 * Key Manager API standard
 * https://ethereum.github.io/keymanager-APIs/
 */
export class Web3SignerApi extends StandardApi {
  /**
   * Signs data for the ETH2 BLS public key specified as part of the URL and returns the signature
   * @see https://consensys.github.io/web3signer/web3signer-eth2.html#tag/Signing
   */
  private signEndpoint = "/api/v1/eth2/sign";

  /**
   * Local Key Manager endpoint
   * @see https://ethereum.github.io/keymanager-APIs/#/Local%20Key%20Manager/
   */
  private localKeymanagerEndpoint = "/eth/v1/keystores";

  /**
   * Server Healthcheck endpoint
   * @see https://consensys.github.io/web3signer/web3signer-eth2.html#tag/Server-Health-Status
   */
  private serverStatusEndpoint = "/healthcheck";

  /**
   *
   */
  public async signVoluntaryExit({
    signerVoluntaryExitRequest,
    pubkey,
  }: {
    signerVoluntaryExitRequest: Web3SignerPostSignvoluntaryexitRequest;
    pubkey: string;
  }): Promise<Web3SignerPostSignvoluntaryexitResponse> {
    try {
      return (await this.request(
        "POST",
        path.join(pubkey),
        JSON.stringify(signerVoluntaryExitRequest)
      )) as Web3SignerPostSignvoluntaryexitResponse;
    } catch (e) {
      e.message += `Error signing (POST) voluntary exit for validator index ${signerVoluntaryExitRequest.voluntary_exit.validator_index}. `;
      throw e;
    }
  }

  /**
   * Import remote keys for the validator client to request duties for.
   * @see https://ethereum.github.io/keymanager-APIs/#/Local%20Key%20Manager/ListKeys
   */
  public async importKeystores(
    postRequest: Web3signerPostRequest
  ): Promise<Web3signerPostResponse> {
    try {
      // IMPORTANT: do not edit the keystore data, it must be exactly as it was received from the remote signer
      return (await this.request(
        "POST",
        this.localKeymanagerEndpoint,
        JSON.stringify(postRequest)
      )) as Web3signerPostResponse;
    } catch (e) {
      e.message += `Error importing (POST) keystores to remote signer. `;
      throw e;
    }
  }

  /**
   * Must delete all keys from request.pubkeys that are known to the validator client and exist in its persistent storage.
   * https://ethereum.github.io/keymanager-APIs/#/Local%20Key%20Manager/ImportKeystores
   */
  public async deleteKeystores(
    deleteRequest: Web3signerDeleteRequest
  ): Promise<Web3signerDeleteResponse> {
    try {
      // Make sure all pubkeys are prefixed with 0x
      deleteRequest.pubkeys = deleteRequest.pubkeys.map((k) =>
        prefix0xPubkey(k)
      );
      const data = JSON.stringify({
        pubkeys: deleteRequest.pubkeys,
      });
      return (await this.request(
        "DELETE",
        this.localKeymanagerEndpoint,
        data
      )) as Web3signerDeleteResponse;
    } catch (e) {
      e.message += `Error deleting (DELETE) keystores from remote signer. `;
      throw e;
    }
  }

  /**
   * List all remote validating pubkeys known to this validator client binary
   * https://ethereum.github.io/keymanager-APIs/#/Remote%20Key%20Manager/ListRemoteKeys
   */
  public async getKeystores(): Promise<Web3signerGetResponse> {
    try {
      return (await this.request(
        "GET",
        this.localKeymanagerEndpoint
      )) as Web3signerGetResponse;
    } catch (e) {
      e.message += `Error getting (GET) keystores from remote signer. `;
      throw e;
    }
  }

  /**
   * Checks the Web3Signer server status. Confirms if Web3Signer is connected and running.
   * https://consensys.github.io/web3signer/web3signer-eth2.html#tag/Reload-Signer-Keys/operation/UPCHECK
   */
  public async getStatus(): Promise<Web3signerHealthcheckResponse> {
    try {
      return (await this.request(
        "GET",
        this.serverStatusEndpoint
      )) as Web3signerHealthcheckResponse;
    } catch (e) {
      e.message += `Error getting (GET) server status. Is Web3Signer running? `;
      throw e;
    }
  }
}

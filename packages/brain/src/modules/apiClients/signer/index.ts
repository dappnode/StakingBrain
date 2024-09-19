import {
  Web3signerPostRequest,
  Web3signerPostResponse,
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerHealthcheckResponse,
  Web3signerPostSignDappnodeRequest,
  Web3SignerPostSignvoluntaryexitRequest,
  Web3SignerPostSignvoluntaryexitResponse,
  Web3signerPostSignDappnodeResponse
} from "./types.js";
import { StandardApi } from "../standard.js";
import path from "node:path";
import { prefix0xPubkey } from "../prefix0xPubkey.js";
import { SignerApiError } from "./error.js";

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
   * Signs proof of validation with timestamp and platform
   * @see TODO: not in doc yet
   */
  private signExtEndpoint = "/api/v1/eth2/ext/sign";

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
   * Origine header required by web3signer
   */
  private originHeader = {
    Origin:
      this.network === "mainnet"
        ? "http://brain.web3signer.dappnode"
        : `http://brain.web3signer-${this.network}.dappnode`
  };

  /**
   * Signs a voluntary exit for the validator with the specified public key
   */
  public async signVoluntaryExit({
    signerVoluntaryExitRequest,
    pubkey
  }: {
    signerVoluntaryExitRequest: Web3SignerPostSignvoluntaryexitRequest;
    pubkey: string;
  }): Promise<Web3SignerPostSignvoluntaryexitResponse> {
    try {
      return await this.request({
        method: "POST",
        endpoint: path.join(this.signEndpoint, pubkey),
        body: JSON.stringify(signerVoluntaryExitRequest),
        headers: this.originHeader
      });
    } catch (e) {
      e.message += `Error signing (POST) voluntary exit for validator index ${signerVoluntaryExitRequest.voluntary_exit.validator_index}. `;
      throw new SignerApiError({ ...e });
    }
  }

  /**
   * Signs a proof of validation for the validator with the specified public key
   */
  public async signDappnodeProofOfValidation({
    signerDappnodeSignRequest,
    pubkey
  }: {
    signerDappnodeSignRequest: Web3signerPostSignDappnodeRequest;
    pubkey: string;
  }): Promise<Web3signerPostSignDappnodeResponse> {
    try {
      return await this.request({
        method: "POST",
        endpoint: path.join(this.signExtEndpoint, pubkey),
        body: JSON.stringify(signerDappnodeSignRequest),
        headers: {
          ...this.originHeader,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });
    } catch (e) {
      e.message += `Error signing (POST) proof of validation for validator ${pubkey}. `;
      throw new SignerApiError({ ...e });
    }
  }

  /**
   * Import remote keys for the validator client to request duties for.
   * @see https://ethereum.github.io/keymanager-APIs/#/Remote%20Key%20Manager/importRemoteKeys
   */
  public async importRemoteKeys(postRequest: Web3signerPostRequest): Promise<Web3signerPostResponse> {
    try {
      // IMPORTANT: do not edit the keystore data, it must be exactly as it was received from the remote signer
      return await this.request({
        method: "POST",
        endpoint: this.localKeymanagerEndpoint,
        body: JSON.stringify(postRequest),
        headers: this.originHeader
      });
    } catch (e) {
      e.message += `Error importing (POST) keystores to remote signer. `;
      throw new SignerApiError({ ...e });
    }
  }

  /**
   * Must delete all keys from request.pubkeys that are known to the validator client and exist in its persistent storage.
   * @see https://ethereum.github.io/keymanager-APIs/#/Remote%20Key%20Manager/deleteRemoteKeys
   */
  public async deleteRemoteKeys(deleteRequest: Web3signerDeleteRequest): Promise<Web3signerDeleteResponse> {
    try {
      // Make sure all pubkeys are prefixed with 0x
      deleteRequest.pubkeys = deleteRequest.pubkeys.map((k) => prefix0xPubkey(k));
      const data = JSON.stringify({
        pubkeys: deleteRequest.pubkeys
      });
      return await this.request({
        method: "DELETE",
        endpoint: this.localKeymanagerEndpoint,
        body: data,
        headers: this.originHeader
      });
    } catch (e) {
      e.message += `Error deleting (DELETE) keystores from remote signer. `;
      throw new SignerApiError({ ...e });
    }
  }

  /**
   * List all remote validating pubkeys known to this validator client binary
   * @see https://ethereum.github.io/keymanager-APIs/#/Remote%20Key%20Manager/ListRemoteKeys
   */
  public async listRemoteKeys(): Promise<Web3signerGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: this.localKeymanagerEndpoint,
        headers: this.originHeader
      });
    } catch (e) {
      e.message += `Error getting (GET) keystores from remote signer. `;
      throw new SignerApiError({ ...e });
    }
  }

  /**
   * Checks the Web3Signer server status. Confirms if Web3Signer is connected and running.
   * @see https://consensys.github.io/web3signer/web3signer-eth2.html#tag/Server-Health-Status/operation/HEALTHCHECK
   */
  public async getStatus(): Promise<Web3signerHealthcheckResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: this.serverStatusEndpoint,
        headers: this.originHeader
      });
    } catch (e) {
      e.message += `Error getting (GET) server status. Is Web3Signer running? `;
      throw new SignerApiError({ ...e });
    }
  }
}

import {
  DappnodeSigningProoverPostRequest,
  Network,
  Web3signerPostSignDappnodeRequest,
  Web3signerPostSignDappnodeResponse,
} from "@stakingbrain/common";
import { Web3SignerApi, DappnodeSigningProover } from "../apiClients/index.js";
import { BrainDataBase } from "../db/index.js";
import logger from "../logger/index.js";

export class ProofOfAttestation {
  private signerApi: Web3SignerApi;
  private brainDb: BrainDataBase;
  private dappnodeSigningProoverApi: DappnodeSigningProover;
  private network: Network;

  constructor(
    signerApi: Web3SignerApi,
    brainDb: BrainDataBase,
    dappnodeSigningProoverApi: DappnodeSigningProover,
    network: Network
  ) {
    this.signerApi = signerApi;
    this.brainDb = brainDb;
    this.dappnodeSigningProoverApi = dappnodeSigningProoverApi;
    this.network = network;
  }

  /**
   * Send the proof of attestation to the dappnode-signatures.io domain
   */
  public async sendProofOfAttestation(): Promise<void> {
    // Get the proofs of attestation from the signer
    const proofsOfAttestations = await this.getProofsOfAttestations();
    await this.dappnodeSigningProoverApi.sendProofOfAttestation(
      proofsOfAttestations
    );
  }

  /**
   * Get the proofs of attestation from the signer
   * for all the pubkeys in the db
   */
  private async getProofsOfAttestations(): Promise<
    DappnodeSigningProoverPostRequest[]
  > {
    const signerDappnodeSignRequest: Web3signerPostSignDappnodeRequest = {
      type: "PROOF_OF_VALIDATION",
      platform: "dappnode",
      timestamp: new Date().toISOString(),
    };
    // get pubkeys detauls from db
    const dbPubkeysDetails = this.brainDb.getData();
    // For each pubkey, get the proof of attestation from the signer
    const proofsOfAttestations = await Promise.all(
      Object.keys(dbPubkeysDetails).map(async (pubkey) => {
        try {
          const { payload, signature }: Web3signerPostSignDappnodeResponse =
            await this.signerApi.signDappnodeProofOfValidation({
              signerDappnodeSignRequest,
              pubkey,
            });
          return {
            payload,
            signature,
            network: this.network,
            tag: dbPubkeysDetails[pubkey].tag,
          };
        } catch (e) {
          logger.error(
            `Error getting proof of attestation for pubkey ${pubkey}. Error: ${e.message}`
          );
          return null;
        }
      })
    );

    return proofsOfAttestations.filter(
      (proofOfAttestation) => proofOfAttestation !== null
    );
  }
}

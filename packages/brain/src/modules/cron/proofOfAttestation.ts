import { Web3signerPostSignDappnodeResponse } from "@stakingbrain/common";
import { Web3SignerApi } from "../apiClients/index.js";
import { BrainDataBase } from "../db/index.js";
import logger from "../logger/index.js";
import { DappnodeSigningProover } from "../apiClients/dappnodeSignerProover.js";

export class ProofOfAttestation {
  private signerApi: Web3SignerApi;
  private brainDb: BrainDataBase;
  private dappnodeSigningProoverApi: DappnodeSigningProover;

  constructor(
    signerApi: Web3SignerApi,
    brainDb: BrainDataBase,
    dappnodeSigningProoverApi: DappnodeSigningProover
  ) {
    this.signerApi = signerApi;
    this.brainDb = brainDb;
    this.dappnodeSigningProoverApi = dappnodeSigningProoverApi;
  }

  /**
   * Send the proof of attestation to the dappnode-signatures.io domain
   */
  public async sendProofOfAttestation(): Promise<void> {
    // Get the proofs of attestation from the signer
    const proofsOfAttestations = await this.getProofsOfAttestations();
    // For each proof of attestation, send it to the dappnode-signatures.io domain
    await Promise.all(
      proofsOfAttestations.map(async (proofOfAttestation) => {
        if ("error" in proofOfAttestation) {
          logger.error(
            `Error getting proof of attestation. Error: ${proofOfAttestation.error}`
          );
          return;
        }
        try {
          await this.dappnodeSigningProoverApi.sendProofOfAttestation(
            proofOfAttestation
          );
        } catch (e) {
          logger.error(
            `Error sending proof of attestation. Error: ${e.message}`
          );
        }
      })
    );
  }

  /**
   * Get the proofs of attestation from the signer
   * for all the pubkeys in the db
   */
  private async getProofsOfAttestations(): Promise<
    (Web3signerPostSignDappnodeResponse | { error: string })[]
  > {
    // Get all the pubkeys from the db
    const dbPubkeys = Object.keys(this.brainDb.getData());
    // For each pubkey, get the proof of attestation from the signer
    return await Promise.all(
      dbPubkeys.map(async (pubkey) => {
        try {
          return await this.signerApi.signDappnodeProofOfValidation({
            signerDappnodeSignRequest: {
              type: "PROOF_OF_VALIDATION",
              platform: "dappnode",
              timestamp: new Date().toISOString(),
            },
            pubkey,
          });
        } catch (e) {
          logger.error(
            `Error getting proof of attestation for pubkey ${pubkey}. Error: ${e.message}`
          );
          return { error: e.message };
        }
      })
    );
    // Return the proofs of attestation
  }
}

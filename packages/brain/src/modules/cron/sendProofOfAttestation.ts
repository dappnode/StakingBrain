import {
  DappnodeSigningProoverPostRequest,
  Network,
  Web3signerPostSignDappnodeRequest,
  Web3signerPostSignDappnodeResponse,
} from "@stakingbrain/common";
import { Web3SignerApi, DappnodeSigningProover } from "../apiClients/index.js";
import { BrainDataBase } from "../db/index.js";
import logger from "../logger/index.js";

/**
 * Send the proof of attestation to the dappnode-signatures.io domain
 */
export async function sendProofOfAttestation(
  signerApi: Web3SignerApi,
  brainDb: BrainDataBase,
  dappnodeSigningProoverApi: DappnodeSigningProover,
  network: Network
): Promise<void> {
  try {
    // Get the proofs of attestation from the signer
    const proofsOfAttestations = await getProofsOfAttestations(
      signerApi,
      brainDb,
      network
    );
    if(proofsOfAttestations.length === 0) return
    await dappnodeSigningProoverApi.sendProofOfAttestation(
      proofsOfAttestations
    );
  } catch (e) {
    logger.error(`Error sending proof of attestation: ${e.message}`);
  }
}

/**
 * Get the proofs of attestation from the signer
 * for all the pubkeys in the db
 */
async function getProofsOfAttestations(
  signerApi: Web3SignerApi,
  brainDb: BrainDataBase,
  network: Network
): Promise<DappnodeSigningProoverPostRequest[]> {
  const signerDappnodeSignRequest: Web3signerPostSignDappnodeRequest = {
    type: "PROOF_OF_VALIDATION",
    platform: "dappnode",
    timestamp: new Date().toISOString(),
  };
  // get pubkeys detauls from db
  const dbPubkeysDetails = brainDb.getData();
  // For each pubkey, get the proof of attestation from the signer
  const proofsOfAttestations = await Promise.all(
    Object.keys(dbPubkeysDetails).map(async (pubkey) => {
      try {
        const { payload, signature }: Web3signerPostSignDappnodeResponse =
          await signerApi.signDappnodeProofOfValidation({
            signerDappnodeSignRequest,
            pubkey,
          });
        return {
          payload,
          signature,
          network: network,
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

  return filterNotNullishFromArray(proofsOfAttestations);
}

/**
 * TODO: update typescript to 5.5 to fix the type predicate issue
 * @see https://devblogs.microsoft.com/typescript/announcing-typescript-5-5-beta/#inferred-type-predicates
 */
function filterNotNullishFromArray<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item) => item !== null && item !== undefined) as T[];
}

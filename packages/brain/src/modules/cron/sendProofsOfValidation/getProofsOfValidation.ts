import { isEmpty } from "lodash-es";
import { Web3SignerApi } from "../../apiClients/index.js";
import {
  DappnodeSignatureVerifierPostRequest,
  Web3signerPostSignDappnodeRequest,
  Web3signerPostSignDappnodeResponse
} from "../../apiClients/types.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Get the proofs of validation from the signer
 * for all the pubkeys in the db
 */
export async function getProofsOfValidation(
  signerApi: Web3SignerApi,
  brainDb: BrainDataBase,
  shareDataWithDappnode: boolean
): Promise<DappnodeSignatureVerifierPostRequest[]> {
  const signerDappnodeSignRequest: Web3signerPostSignDappnodeRequest = {
    type: "PROOF_OF_VALIDATION",
    platform: "dappnode",
    timestamp: Date.now().toString()
  };
  // get pubkeys detauls from db
  const dbPubkeysDetails = brainDb.getData();

  // only send proof of validation if the user has enabled it
  // or if there is a stader pubkey
  const dbPubkeysDetailsFiltered = Object.fromEntries(
    Object.entries(dbPubkeysDetails).filter(([, details]) => shareDataWithDappnode || details.tag === "stader")
  );
  if (isEmpty(dbPubkeysDetailsFiltered)) return [];
  // For each pubkey, get the proof of validation from the signer
  const proofsOfValidations = await Promise.all(
    Object.keys(dbPubkeysDetailsFiltered).map(async (pubkey) => {
      try {
        const { payload, signature }: Web3signerPostSignDappnodeResponse =
          await signerApi.signDappnodeProofOfValidation({
            signerDappnodeSignRequest,
            pubkey
          });
        return {
          payload,
          pubkey,
          signature,
          tag: dbPubkeysDetailsFiltered[pubkey].tag
        };
      } catch (e) {
        logger.error(`${logPrefix}Error getting proof of validation for pubkey ${pubkey}. Error: ${e.message}`);
        return null;
      }
    })
  );

  return filterNotNullishFromArray(proofsOfValidations);
}

/**
 * TODO: update typescript to 5.5 to fix the type predicate issue
 * @see https://devblogs.microsoft.com/typescript/announcing-typescript-5-5-beta/#inferred-type-predicates
 */
function filterNotNullishFromArray<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item) => item !== null && item !== undefined) as T[];
}

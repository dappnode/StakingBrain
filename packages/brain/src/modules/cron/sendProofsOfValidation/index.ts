import { Web3SignerApi, DappnodeSignatureVerifier } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { getProofsOfValidation } from "./getProofsOfValidation.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Send the proof of validation to the dappnode-signatures.io domain
 */
export async function sendProofsOfValidation(
  signerApi: Web3SignerApi,
  brainDb: BrainDataBase,
  DappnodeSignatureVerifier: DappnodeSignatureVerifier,
  shareDataWithDappnode: boolean
): Promise<void> {
  try {
    // Get the proofs of validation from the signer
    const proofsOfValidations = await getProofsOfValidation(signerApi, brainDb, shareDataWithDappnode);
    if (proofsOfValidations.length === 0) {
      logger.debug(`${logPrefix}No proofs of validation to send`);
      return;
    }
    logger.debug(`${logPrefix}Sending ${proofsOfValidations.length} proofs of validations`);
    await DappnodeSignatureVerifier.sendProofsOfValidation(proofsOfValidations);
  } catch (e) {
    logger.error(`${logPrefix}Error sending proof of validation: ${e.message}`);
  }
}

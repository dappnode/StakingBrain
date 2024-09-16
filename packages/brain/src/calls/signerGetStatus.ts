import { signerApi } from "../index.js";
import { Web3signerHealthcheckResponse } from "../types.js";

/**
 * Get signer status
 * @returns
 */
export async function signerGetStatus(): Promise<Web3signerHealthcheckResponse> {
  return await signerApi.getStatus();
}

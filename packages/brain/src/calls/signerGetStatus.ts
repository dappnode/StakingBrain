import { Web3signerHealthcheckResponse } from "@stakingbrain/common";
import { signerApi } from "../index.js";

/**
 * Get signer status
 * @returns
 */
export async function signerGetStatus(): Promise<Web3signerHealthcheckResponse> {
  return await signerApi.getStatus();
}

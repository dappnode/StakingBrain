import { Web3SignerApi } from "../../../apiClients/index.js";
import { Web3signerHealthcheckResponse } from "../../../apiClients/types.js";

/**
 * Get signer status
 * @returns
 */
export async function signerGetStatus({
  signerApi
}: {
  signerApi: Web3SignerApi;
}): Promise<Web3signerHealthcheckResponse> {
  return await signerApi.getStatus();
}

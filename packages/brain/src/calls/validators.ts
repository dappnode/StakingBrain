import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerPostRequest,
  Web3signerPostRequestFromUi,
  Web3signerPostResponse,
} from "@stakingbrain/common";
import { signerApi } from "../index.js";

/**
 * Import keystores:
 * 1. Import keystores + passwords on web3signer API
 * 2. Import pubkeys on validator API
 * 3. Import feeRecipient on Validator API
 * 4. Write on db
 * @param postRequest
 * @returns
 */
export async function importValidators(
  postRequest: Web3signerPostRequestFromUi
): Promise<Web3signerPostResponse> {
  function readFile(files: File[]): string[] {
    const fileContents: string[] = [];
    // Type File is from the web, cast it to Buffer
    for (const file of files as unknown as Buffer[])
      fileContents.push(file.toString());
    return fileContents;
  }

  let data: Web3signerPostRequest;
  if (postRequest.slashing_protection) {
    data = {
      keystores: readFile(postRequest.keystores),
      passwords: postRequest.passwords,
      slashing_protection: readFile([postRequest.slashing_protection])[0],
    };
  } else {
    data = {
      keystores: readFile(postRequest.keystores),
      passwords: postRequest.passwords,
    };
  }
  return await signerApi.importKeystores(data);
}

/**
 * Delete keystores:
 * 1. Delete keystores on web3signer API
 * 2. Delete pubkeys on validator API
 * 3. Delete feeRecipient on Validator API
 * 4. Write on db
 * @param deleteRequest
 * @returns
 */
export async function deleteValidators(
  deleteRequest: Web3signerDeleteRequest
): Promise<Web3signerDeleteResponse> {
  return await signerApi.deleteKeystores(deleteRequest);
}

/**
 * Get keystores:
 * 1. Get keystores on web3signer API
 * 2. Get pubkeys on validator API
 * 3. Get feeRecipient on Validator API
 * 4. Compare and Write on db
 * @returns
 */
export async function getValidators(): Promise<Web3signerGetResponse> {
  return await signerApi.getKeystores();
}

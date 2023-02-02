import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerHealthcheckResponse,
  Web3signerPostRequest,
  Web3signerPostRequestFromUi,
  Web3signerPostResponse,
} from "@stakingbrain/common";
import { signerApi } from "../index.js";

export async function signerImportKeystores(
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
  console.log(data);
  return await signerApi.importKeystores(data);
}

export async function signerDeleteKeystores(
  deleteRequest: Web3signerDeleteRequest
): Promise<Web3signerDeleteResponse> {
  return await signerApi.deleteKeystores(deleteRequest);
}

export async function signerGetKeystores(): Promise<Web3signerGetResponse> {
  return await signerApi.getKeystores();
}

export async function signerGetStatus(): Promise<Web3signerHealthcheckResponse> {
  return await signerApi.getStatus();
}

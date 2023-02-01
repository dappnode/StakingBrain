import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerHealthcheckResponse,
  Web3signerPostRequest,
  Web3signerPostResponse,
} from "@stakingbrain/common";
import { signerApi } from "../index.js";

export async function signerImportKeystores(
  postRequest: Web3signerPostRequest
): Promise<Web3signerPostResponse> {
  return await signerApi.importKeystores(postRequest);
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

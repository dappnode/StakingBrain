import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerHealthcheckResponse,
  Web3signerPostRequest,
  Web3signerPostResponse,
} from "@stakingbrain/common";
import { signerApi } from "../index.js";

export async function importKeystores(
  postRequest: Web3signerPostRequest
): Promise<Web3signerPostResponse> {
  return await signerApi.importKeystores(postRequest);
}

export async function deleteKeystores(
  deleteRequest: Web3signerDeleteRequest
): Promise<Web3signerDeleteResponse> {
  return await signerApi.deleteKeystores(deleteRequest);
}

export async function getKeystores(): Promise<Web3signerGetResponse> {
  return await signerApi.getKeystores();
}

export async function getStatus(): Promise<Web3signerHealthcheckResponse> {
  return await signerApi.getStatus();
}

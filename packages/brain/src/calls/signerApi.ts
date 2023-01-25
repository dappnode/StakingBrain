import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerGetResponse,
  Web3signerHealthcheckResponse,
  Web3signerPostRequest,
  Web3signerPostResponse,
} from "@stakingbrain/common";
import { Web3SignerApi } from "../modules/apis/web3signerApi/index.js";

// TODO: implement baseUrl (it shoulñd be determined from envRuntim)
const signerApi = new Web3SignerApi({ baseUrl: "" });

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

import {
  Web3signerGetResponse,
  BeaconchaGetResponse,
} from "@stakingbrain/common";
import { BeaconchaApi } from "../modules/apis/beaconchaApi/index.js";

// TODO: implement baseUrl (it shoulñd be determined from envRuntim)
const beaconchaApi = new BeaconchaApi({ baseUrl: "" });

export async function fetchValidatorsInfo(
  pubkeys: string[]
): Promise<BeaconchaGetResponse> {
  return await beaconchaApi.fetchValidatorsInfo(pubkeys);
}

export async function fetchAllValidatorsInfo(
  keystoresGet: Web3signerGetResponse
): Promise<BeaconchaGetResponse[]> {
  return await beaconchaApi.fetchAllValidatorsInfo({ keystoresGet });
}

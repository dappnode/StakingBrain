import {
  Web3signerGetResponse,
  BeaconchaGetResponse,
} from "@stakingbrain/common";
import { beaconchaApi } from "../index.js";

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

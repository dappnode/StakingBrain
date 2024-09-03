import { BeaconchaGetResponse } from "@stakingbrain/common";
import { beaconchaApi } from "../index.js";

export async function beaconchaFetchValidatorsInfo(pubkeys: string[]): Promise<BeaconchaGetResponse> {
  return await beaconchaApi.fetchValidatorsInfo(pubkeys);
}

export async function beaconchaFetchAllValidatorsInfo(pubkeys: string[]): Promise<BeaconchaGetResponse[]> {
  return await beaconchaApi.fetchAllValidatorsInfo({ pubkeys });
}

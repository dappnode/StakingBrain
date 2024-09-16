import { blockExplorerApi } from "../index.js";
import { BeaconchaGetResponse } from "../types.js";

export async function beaconchaFetchValidatorsInfo(pubkeys: string[]): Promise<BeaconchaGetResponse> {
  return await blockExplorerApi.fetchValidatorsInfo(pubkeys);
}

export async function beaconchaFetchAllValidatorsInfo(pubkeys: string[]): Promise<BeaconchaGetResponse[]> {
  return await blockExplorerApi.fetchAllValidatorsInfo({ pubkeys });
}

import { BlockExplorerApi } from "../../../apiClients/index.js";
import { BeaconchaGetResponse } from "../../../apiClients/types.js";

export async function beaconchaFetchValidatorsInfo({
  blockExplorerApi,
  pubkeys
}: {
  blockExplorerApi: BlockExplorerApi;
  pubkeys: string[];
}): Promise<BeaconchaGetResponse> {
  return await blockExplorerApi.fetchValidatorsInfo(pubkeys);
}

export async function beaconchaFetchAllValidatorsInfo({
  blockExplorerApi,
  pubkeys
}: {
  blockExplorerApi: BlockExplorerApi;
  pubkeys: string[];
}): Promise<BeaconchaGetResponse[]> {
  return await blockExplorerApi.fetchAllValidatorsInfo({ pubkeys });
}

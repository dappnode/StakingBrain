import { CustomValidatorGetResponse } from "@stakingbrain/common";
import { beaconchaApiParamsMap } from "../params";

export default function buildValidatorSummaryURL({
  allValidatorsInfo,
  network,
}: {
  allValidatorsInfo: CustomValidatorGetResponse[];
  network: string;
}): string {
  if (!beaconchaApiParamsMap.has(network)) {
    throw new Error(`Invalid network: ${network}`);
  }

  const baseUrl = beaconchaApiParamsMap.get(network)?.baseUrl;
  if (!baseUrl) return "";

  let summaryValidatorURL = baseUrl + "/dashboard?validators=";

  allValidatorsInfo.forEach((validatorChunk) => {
    summaryValidatorURL += validatorChunk.index.toString() + ",";
  });

  return summaryValidatorURL;
}

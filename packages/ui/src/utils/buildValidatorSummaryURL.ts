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

  const validIndices = allValidatorsInfo
    .filter((validator) => validator.index !== -1)
    .map((validator) => validator.index);

  const validatorIndicesStr = validIndices.join(",");

  return `${baseUrl}/dashboard?validators=${validatorIndicesStr}`;
}

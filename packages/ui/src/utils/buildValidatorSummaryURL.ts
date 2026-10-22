import type { BeaconchaGetResponse } from "@stakingbrain/brain";
import { beaconchaApiParamsMap } from "../params";

export default function buildValidatorSummaryURL({
  allValidatorsInfo,
  network
}: {
  allValidatorsInfo: BeaconchaGetResponse[];
  network: string;
}): string {
  if (!beaconchaApiParamsMap.has(network)) {
    throw new Error(`Invalid network: ${network}`);
  }

  const baseUrl = beaconchaApiParamsMap.get(network)?.baseUrl;
  if (!baseUrl) return "";

  const indexes = allValidatorsInfo.flatMap((chunk) => chunk.data.map(({ validatorindex }) => validatorindex));
  return baseUrl + "/dashboard?validators=" + indexes.join(",");
}

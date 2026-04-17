import type { BeaconchaGetResponse } from "@stakingbrain/brain";
import { beaconchaApiParamsMap } from "../params";

// Networks where the explorer does not support multi-validator dashboard URLs
const singleValidatorNetworks = ["gnosis, lukso"];

export default function buildValidatorSummaryURL({
  allValidatorsInfo,
  network
}: {
  allValidatorsInfo: BeaconchaGetResponse[];
  network: string;
}): string[] {
  if (!beaconchaApiParamsMap.has(network)) {
    throw new Error(`Invalid network: ${network}`);
  }

  const baseUrl = beaconchaApiParamsMap.get(network)?.baseUrl;
  if (!baseUrl) return [];

  const allIndexes: number[] = [];
  allValidatorsInfo.forEach((validatorChunk) => {
    validatorChunk.data.forEach((validator) => {
      if (validator.validatorindex !== undefined) allIndexes.push(validator.validatorindex);
    });
  });

  if (allIndexes.length === 0) return [];

  if (singleValidatorNetworks.includes(network)) {
    // These explorers only support one validator per URL
    return allIndexes.map((index) => `${baseUrl}/validator/${index}`);
  }

  // Networks that support multi-validator dashboard URLs
  return [`${baseUrl}/dashboard?validators=${allIndexes.join(",")}`];
}

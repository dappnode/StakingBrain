import { blockExplorerUrls } from "../params";

export default function buildValidatorSummaryURL({
  validatorIndexes,
  network
}: {
  validatorIndexes: string[];
  network: string;
}): string {
  const baseUrl = blockExplorerUrls.get(network);
  if (!baseUrl) {
    throw new Error(`Invalid network: ${network}`);
  }

  if (validatorIndexes.length === 0 || validatorIndexes.some((index) => !/^\d+$/.test(index))) return "";

  return baseUrl + "/dashboard?validators=" + validatorIndexes.join(",");
}

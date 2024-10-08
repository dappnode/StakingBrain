import { fetchAndProcessValidatorsData } from "../modules/validatorsDataIngest/index.js";
import { minGenesisTime, secondsPerSlot } from "../index.js";
import type { EpochsValidatorsMap, NumberOfDaysToQuery } from "../modules/validatorsDataIngest/types.js";
import { PostgresClient } from "../modules/apiClients/index.js";

export async function fetchValidatorsPerformanceData({
  postgresClient,
  validatorIndexes,
  numberOfDaysToQuery
}: {
  postgresClient: PostgresClient;
  validatorIndexes: string[];
  numberOfDaysToQuery?: NumberOfDaysToQuery;
}): Promise<EpochsValidatorsMap> {
  return await fetchAndProcessValidatorsData({
    validatorIndexes,
    postgresClient,
    minGenesisTime,
    secondsPerSlot,
    numberOfDaysToQuery
  });
}

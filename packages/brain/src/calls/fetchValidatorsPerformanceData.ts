import { fetchAndProcessValidatorsData } from "../modules/validatorsDataIngest/index.js";
import { minGenesisTime, secondsPerSlot } from "../index.js";
import { PostgresClient } from "../modules/apiClients/index.js";
import type { NumberOfDaysToQuery } from "../modules/validatorsDataIngest/types.js";
import type { EpochsValidatorsMap } from "../modules/apiClients/postgres/types.js";

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

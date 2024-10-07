import { fetchAndProcessValidatorsData } from "../modules/validatorsDataIngest/index.js";
import { minGenesisTime, secondsPerSlot } from "../index.js";
import type {
  ValidatorsDataProcessed,
  Granularity,
  NumberOfDaysToQuery
} from "../modules/validatorsDataIngest/types.js";
import { PostgresClient } from "../modules/apiClients/index.js";

export async function fetchValidatorsPerformanceData({
  postgresClient,
  validatorIndexes,
  numberOfDaysToQuery,
  granularity
}: {
  postgresClient: PostgresClient;
  validatorIndexes: string[];
  numberOfDaysToQuery?: NumberOfDaysToQuery;
  granularity?: Granularity;
}): Promise<
  Map<
    number, // validatorIndex
    ValidatorsDataProcessed // processed data of the validator
  >
> {
  return await fetchAndProcessValidatorsData({
    validatorIndexes,
    postgresClient,
    minGenesisTime,
    secondsPerSlot,
    numberOfDaysToQuery,
    granularity
  });
}

import { fetchAndProcessValidatorsData } from "../modules/validatorsDataIngest/index.js";
import { minGenesisTime, postgresClient, secondsPerSlot } from "../index.js";
import type {
  ValidatorsDataProcessed,
  Granularity,
  NumberOfDaysToQuery
} from "../modules/validatorsDataIngest/types.js";

export async function fetchValidatorsPerformanceData({
  validatorIndexes,
  numberOfDaysToQuery,
  granularity
}: {
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

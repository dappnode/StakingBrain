import { PostgresClient } from "../../../../modules/apiClients/index.js";
import type { NumberOfDaysToQuery } from "../../../../modules/validatorsDataIngest/types.js";
import type { EpochsValidatorsMap } from "../../../../modules/apiClients/postgres/types.js";
import { fetchAndProcessValidatorsData } from "../../../validatorsDataIngest/index.js";

export async function fetchValidatorsPerformanceData({
  postgresClient,
  validatorIndexes,
  numberOfDaysToQuery,
  minGenesisTime,
  secondsPerSlot
}: {
  postgresClient: PostgresClient;
  validatorIndexes: string[];
  numberOfDaysToQuery?: NumberOfDaysToQuery;
  minGenesisTime: number;
  secondsPerSlot: number;
}): Promise<EpochsValidatorsMap> {
  return await fetchAndProcessValidatorsData({
    validatorIndexes,
    postgresClient,
    minGenesisTime,
    secondsPerSlot,
    numberOfDaysToQuery
  });
}

import { PostgresClient } from "../apiClients/index.js";
import logger from "../logger/index.js";
import { getStartAndEndEpochs } from "./getStartAndEndEpochs.js";
import { NumberOfDaysToQuery, EpochsValidatorsMap } from "./types.js";

/**
 * Get the processed data for the validators in the given date range and the given validators indexes.
 *
 * @param validatorIndexes - Array of validator indexes.
 * @param postgresClient - Postgres client to interact with the DB.
 * @param minGenesisTime - The genesis time of the chain.
 * @param secondsPerSlot - The number of seconds per slot.
 * @param dateRange - The date range to get the data from.
 * @returns the processed data for the validators
 */
export async function fetchAndProcessValidatorsData({
  validatorIndexes,
  postgresClient,
  minGenesisTime,
  secondsPerSlot,
  numberOfDaysToQuery = 1
}: {
  validatorIndexes: string[];
  postgresClient: PostgresClient; // import from backend index
  minGenesisTime: number; // import from backend index
  secondsPerSlot: number; // immport from backend index
  numberOfDaysToQuery?: NumberOfDaysToQuery;
}): Promise<EpochsValidatorsMap> {
  logger.info("Processing epochs data");

  // Get start timestamp and end timestamp
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - numberOfDaysToQuery);

  // Calculate the epochs for the given dates
  const { startEpoch, endEpoch } = getStartAndEndEpochs({ minGenesisTime, secondsPerSlot, startDate, endDate });

  return await postgresClient.getEpochsDataMapForEpochRange({
    startEpoch,
    endEpoch,
    validatorIndexes
  });
}

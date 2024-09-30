import { PostgresClient } from "../apiClients/index.js";
import logger from "../logger/index.js";
import { getStartAndEndEpochs } from "./getStartAndEndEpochs.js";
import { getAttestationSuccessRate } from "./getAttestationSuccessRate.js";
import { Granularity, NumberOfDaysToQuery, ValidatorsDataProcessed } from "./types.js";
import { getIntervalsEpochs } from "./getIntervalsEpochs.js";
import { getAttestationSuccessRatePerClients } from "./getAttestationSuccessRatePerClients.js";
import { getClientsUsedPerIntervalsMap } from "./getClientsUsedPerIntervalsMap.js";

// Module in charge of querying and processin the data of the validators to get the performance metrics:
// - Attestation success rate
// - Blocks proposed success rate
// - Mean attestation success rate
// - Mean blocks proposed success rate

// Note: It is overkill to store in db the attestation success rate for each epoch since it is only useful froma a global perspective
// taking into account the historical data. As for now we will calculate dynamicall the attestation success rate with the arguments: epoch start and epoch end.

// TODO: return current validator balance: 2 ways of doing it: 1) **get the balance from the beaconchain API**, 2) store the ideal rewards with the effective balance and get the balance from the postgres DB. The second option is more efficient but it is not real time.
// TODO: return to the frontend the remaining seconds to next epoch. In the frontend use this parameter to query the backend every time the epoch changes.
// TODO: add to block proposed epoch and slot

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
  numberOfDaysToQuery = 1,
  granularity = Granularity.Hourly
}: {
  validatorIndexes: string[];
  postgresClient: PostgresClient; // import from backend index
  minGenesisTime: number; // import from backend index
  secondsPerSlot: number; // immport from backend index
  numberOfDaysToQuery?: NumberOfDaysToQuery;
  granularity?: Granularity;
}): Promise<
  Map<
    number, // validatorIndex
    ValidatorsDataProcessed // processed data of the validator
  >
> {
  logger.info("Processing validators data");
  const mapValidatorPerformance = new Map<number, ValidatorsDataProcessed>();

  // Get start timestamp and end timestamp
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - numberOfDaysToQuery);

  // Calculate the epochs for the given dates
  const { startEpoch, endEpoch } = getStartAndEndEpochs({ minGenesisTime, secondsPerSlot, startDate, endDate });

  // Get the start and end epochs for each interval
  const intervals = getIntervalsEpochs({ startDate, endDate, granularity, minGenesisTime, secondsPerSlot });

  // Get the validators data from the postgres database with the start and end epoch
  const validatorsDataMap = await postgresClient.getValidatorsDataMapForEpochRange({
    validatorIndexes,
    startEpoch,
    endEpoch
  });

  // Calculate the attestation success rate for each validator
  for (const [validatorIndex, validatorData] of validatorsDataMap.entries())
    mapValidatorPerformance.set(validatorIndex, {
      attestationSuccessRate: getAttestationSuccessRate({ validatorData, startEpoch, endEpoch }),
      attestationSuccessRatePerClients: getAttestationSuccessRatePerClients({ validatorData, startEpoch, endEpoch }),
      attestationSuccessRatePerInterval: intervals.map(({ startEpoch, endEpoch }) => {
        return {
          startEpoch,
          endEpoch,
          attestationSuccessRate: getAttestationSuccessRate({ validatorData, startEpoch, endEpoch }),
          clientsUsedInInterval: getClientsUsedPerIntervalsMap({ validatorData, startEpoch, endEpoch })
        };
      }),
      blocks: {
        proposed: validatorData.filter((data) => data.blockProposalStatus === "Proposed").length,
        missed: validatorData.filter((data) => data.blockProposalStatus === "Missed").length
      }
    });

  // Return the processed data
  return mapValidatorPerformance;
}

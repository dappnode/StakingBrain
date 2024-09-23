import { PostgresClient } from "../apiClients/index.js";
import logger from "../logger/index.js";
import { getStartAndEndEpochs } from "./getStartAndEndEpochs.js";
import { calculateAttestationSuccessRate } from "./calculateAttestationSuccessRate.js";
import { calculateBlocksProposedSuccessRate } from "./calculateBlocksProposedSuccessRate.js";
import { ValidatorsPerformanceProcessed } from "./types.js";

// Module in charge of querying and processin the data of the validators to get the performance metrics:
// - Attestation success rate
// - Blocks proposed success rate
// - Mean attestation success rate
// - Mean blocks proposed success rate

// Note: It is overkill to store in db the attestation success rate for each epoch since it is only useful froma a global perspective
// taking into account the historical data. As for now we will calculate dynamicall the attestation success rate with the arguments: epoch start and epoch end.

// TODO: return current validator balance: 2 ways of doing it: 1) get the balance from the beaconchain API, 2) store the ideal rewards with the effective balance and get the balance from the postgres DB. The second option is more efficient but it is not real time.
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
export async function getValidatorsDataProcessed({
  validatorIndexes,
  postgresClient,
  minGenesisTime,
  secondsPerSlot,
  dateRange
}: {
  validatorIndexes: string[];
  postgresClient: PostgresClient;
  minGenesisTime: number;
  secondsPerSlot: number;
  dateRange?: { startDate: Date; endDate: Date };
}): Promise<ValidatorsPerformanceProcessed> {
  logger.info("Processing validators data");

  const mapValidatorPerformance: Map<string, { attestationSuccessRate: number; blocksProposedSuccessRate: number }> =
    new Map();

  // Calculate the epochs for the given dates, if no dates are given then use the last 7 days epoch and the latest epoch
  const { startEpoch, endEpoch } = getStartAndEndEpochs(minGenesisTime, secondsPerSlot, dateRange);

  // Get the validators data from the postgres database
  const validatorsDataMap = await postgresClient.getValidatorsDataMapForEpochRange({
    validatorIndexes,
    startEpoch,
    endEpoch
  });

  // Calculate the attestation success rate for each validator
  for (const [validatorIndex, validatorData] of validatorsDataMap.entries())
    mapValidatorPerformance.set(validatorIndex, {
      attestationSuccessRate: calculateAttestationSuccessRate({
        validatorData,
        startEpoch,
        endEpoch
      }),
      blocksProposedSuccessRate: calculateBlocksProposedSuccessRate({
        validatorData
      })
    });

  // Calculate the mean attestation success rate
  const meanAttestationSuccessRate =
    Array.from(mapValidatorPerformance.values()).reduce(
      (acc, { attestationSuccessRate }) => acc + attestationSuccessRate,
      0
    ) / mapValidatorPerformance.size;

  // Calculate the mean blocks proposed success rate
  const meanBlocksProposedSuccessRate =
    Array.from(mapValidatorPerformance.values()).reduce(
      (acc, { blocksProposedSuccessRate }) => acc + blocksProposedSuccessRate,
      0
    ) / mapValidatorPerformance.size;

  // Return the processed data
  return {
    mapValidatorPerformance,
    meanAttestationSuccessRate,
    meanBlocksProposedSuccessRate
  };
}

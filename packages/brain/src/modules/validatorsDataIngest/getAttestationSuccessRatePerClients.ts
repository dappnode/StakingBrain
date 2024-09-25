import { getAttestationSuccessRate } from "./getAttestationSuccessRate.js";
import type { ExecutionConsensusConcatenated } from "./types.js";
import type { ValidatorPerformance } from "../apiClients/postgres/types.js";

/**
 * Calculates the attestation success rate for a given validator per Execution and Consensus client.
 *
 * @param validatorData the data of the validator from the postgres database
 * @param startEpoch the start epoch of the data set
 * @param endEpoch the end epoch of the data set
 */
export function getAttestationSuccessRatePerClients({
  validatorData,
  startEpoch,
  endEpoch
}: {
  validatorData: ValidatorPerformance[];
  startEpoch: number;
  endEpoch: number;
}): Map<ExecutionConsensusConcatenated, number> {
  const attestationSuccessRatePerClients = new Map<ExecutionConsensusConcatenated, number>();

  const dataByClient = new Map<ExecutionConsensusConcatenated, ValidatorPerformance[]>();
  for (const data of validatorData) {
    const key: ExecutionConsensusConcatenated = `${data.executionClient}-${data.consensusClient}`;
    if (!dataByClient.has(key)) dataByClient.set(key, []);
    dataByClient.get(key)?.push(data);
  }

  // calculate the attestation success rate for each client combination
  for (const [key, data] of dataByClient.entries())
    attestationSuccessRatePerClients.set(key, getAttestationSuccessRate({ validatorData: data, startEpoch, endEpoch }));

  return attestationSuccessRatePerClients;
}

import type { ValidatorPerformance } from "../apiClients/postgres/types.js";
import type { ExecutionConsensusConcatenated } from "./types.js";

export function getClientsUsedPerIntervalsMap({
  validatorData,
  startEpoch,
  endEpoch
}: {
  validatorData: ValidatorPerformance[];
  startEpoch: number;
  endEpoch: number;
}): Map<ExecutionConsensusConcatenated, number> {
  const clientsUsedInInterval = new Map<ExecutionConsensusConcatenated, number>();

  const dataByClient = new Map<ExecutionConsensusConcatenated, ValidatorPerformance[]>();
  for (const data of validatorData) {
    const key: ExecutionConsensusConcatenated = `${data.executionClient}-${data.consensusClient}`;
    if (!dataByClient.has(key)) dataByClient.set(key, []);
    dataByClient.get(key)?.push(data);
  }

  // calculate the number of epochs the client was used in the interval
  for (const [key, data] of dataByClient.entries())
    clientsUsedInInterval.set(key, data.filter((data) => data.epoch >= startEpoch && data.epoch < endEpoch).length);

  return clientsUsedInInterval;
}

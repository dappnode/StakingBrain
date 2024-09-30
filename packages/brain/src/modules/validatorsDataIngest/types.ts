import { ConsensusClient, ExecutionClient } from "@stakingbrain/common";

export type ExecutionConsensusConcatenated = `${ExecutionClient}-${ConsensusClient}`;

export interface ValidatorsDataProcessed {
  attestationSuccessRate: number; // mean attestationSuccessRate of the validator
  attestationSuccessRatePerClients: Map<ExecutionConsensusConcatenated, number>;
  // attestationSuccessRate in each interval
  attestationSuccessRatePerInterval: {
    startEpoch: number; // start epoch of the interval
    endEpoch: number; // end epoch of the interval
    attestationSuccessRate: number | null; // attestationSuccessRate in the interval
    clientsUsedInInterval: Map<ExecutionConsensusConcatenated, number>; // Map indexed by ["execution-consensus"] (i.e "geth-lighthouse") with the number of epochs the client was used in the interval
  }[];
  blocks: {
    // TODO: add slot { epoch: number, slot: number }
    proposed: { epoch: number }[];
    missed: { epoch: number }[];
    unchosen: { epoch: number }[];
  };
}

export enum Granularity {
  Hourly = 3600000, // 1 hour in milliseconds
  Daily = 86400000, // 1 day in milliseconds
  Weekly = 604800000 // 7 days in milliseconds
}

export type NumberOfDaysToQuery = 1 | 7 | 28;

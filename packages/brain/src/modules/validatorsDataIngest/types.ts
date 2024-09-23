export interface ValidatorsDataProcessed {
  attestationSuccessRate: number; // mean attestationSuccessRate of the validator
  // attestationSuccessRate in each interval
  attestationSuccessRatePerInterval: {
    startEpoch: number; // start epoch of the interval
    endEpoch: number; // end epoch of the interval
    attestationSuccessRate: number | null; // attestationSuccessRate in the interval
  }[];
  blocks: {
    proposed: number; // number of blocks proposed
    missed: number; // number of blocks missed
  };
}

export enum Granularity {
  Hourly = 3600000, // 1 hour in milliseconds
  Daily = 86400000, // 1 day in milliseconds
  Weekly = 604800000 // 7 days in milliseconds
}

export type NumberOfDaysToQuery = 1 | 7 | 28;

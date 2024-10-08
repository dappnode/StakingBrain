import { Tag } from "@stakingbrain/common";
import { BlockProposalStatus } from "../apiClients/postgres/types";
import { IdealRewards, TotalRewards } from "../apiClients/types";

// TODO: index epoch data per slot

// Indexed by epoch number
export type EpochsValidatorsMap = Map<number, ValidatorsEpochMap>;
// Indexed by validator index
export type ValidatorsEpochMap = Map<number, DataPerEpoch>;
export interface DataPerEpoch {
  attestation: {
    totalRewards: TotalRewards;
    idealRewards: IdealRewards;
  };
  block: {
    status: BlockProposalStatus; // todo: pick only proposed and missed
    slot?: number;
    graffiti?: string;
    reward?: number;
  };
  syncCommittee: {
    reward: number;
  };
  tag: Tag;
}

export enum Granularity {
  Hourly = 3600000, // 1 hour in milliseconds
  Daily = 86400000, // 1 day in milliseconds
  Weekly = 604800000 // 7 days in milliseconds
}

export type NumberOfDaysToQuery = 1 | 7 | 28;

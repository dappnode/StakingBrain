import { Tag } from "@stakingbrain/common";
import { MevSpSubscriptionStatus } from "@stakingbrain/common";

export enum ImportStatus {
  Imported = "Imported",
  NotImported = "Not imported",
  Importing = "Importing...",
}

export enum BeaconchaUrlBuildingStatus {
  NotStarted,
  Success,
  Error,
  InProgress,
  NoIndexes,
}

export type KeystoreInfo = {
  file: File;
  pubkey: string;
};

export interface TagSelectOption {
  value: Tag;
  label: string;
}

export const alertTypes = [
  "successAlert",
  "errorAlert",
  "onlyEditableFeesAlert",
  "feeAlreadySetToAllAlert",
  "subSmoothStep1Alert",
  "subSmoothStep2Alert",
  "unsubSmoothAlert",
  "blsFormatAlert",
  "errorFormatAlert",
  "alreadySmoothAlert",
  "noMevBoostSetAlert",
] as const;

export type AlertType = (typeof alertTypes)[number];

export type NonEcdsaValidatorsData = {
  pubkey: string;
  withdrawalFormat: "bls" | "unknown" | "error";
};

export interface SmoothStatusByPubkey {
  [pubkey: string]: MevSpSubscriptionStatus;
}

export interface SmoothStatusProps {
  rowData: {
    row: {
      pubkey: string;
      feeRecipient: string;
      tag: string;
      withdrawalCredentials: {
        format: string;
        address: string;
      };
    };
  };
  subscriptionStatus: MevSpSubscriptionStatus | null;
  mevSpFeeRecipient: string | null;
  oracleCallError: string | undefined;
}
import { Tag } from "@stakingbrain/common";

export enum ImportStatus {
  IMPORTED = "Imported",
  NOT_IMPORTED = "Not imported",
  IMPORTING = "Importing...",
}

export enum BeaconchaUrlBuildingStatus {
  NOT_STARTED,
  SUCCESS,
  ERROR,
  IN_PROGRESS,
  NO_INDEXES,
}

export type KeystoreInfo = {
  file: File;
  pubkey: string;
};

export interface TagSelectOption {
  value: Tag;
  label: string;
}

export interface BasicValidatorRow {
  pubkey: string;
  feeRecipient: string;
  tag: Tag;
}

export enum MevSpSubscriptionStatus {
  SUBSCRIBED = "Subscribed",
  UNSUBSCRIBED = "Unsubscribed",
  UNAVAILABLE = "Unavailable", // Network or protocol not supported for MEV SP
}
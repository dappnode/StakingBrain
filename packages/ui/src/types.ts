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
  ACTIVE = "active",
  YELLOW_CARD = "yellowcard",
  RED_CARD = "redcard",
  BANNED = "banned",
  NOT_SUBSCRIBED = "notsubscribed",
}

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
  subscriptionStatus: MevSpSubscriptionStatus;
  network: string;
}
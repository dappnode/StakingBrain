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
  SUBSCRIBED = "active",
  YELLOW_CARD = "yellowcard",
  RED_CARD = "redcard",
  BANNED = "banned",
  NOT_SUBSCRIBED = "notsubscribed",
}

export interface ValidatorData {
  index: string;
  subscriptionStatus: string;
}

export interface ValidatorDataMap {
  [pubkey: string]: ValidatorData;
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
  validatorData: ValidatorDataMap;
  network: string;
}
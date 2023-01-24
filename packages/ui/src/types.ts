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

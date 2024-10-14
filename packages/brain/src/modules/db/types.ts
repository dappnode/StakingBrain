import { Tag } from "@stakingbrain/common";

/**
 * DbSlot represents the line in the database for a given public key:
 * @param pubkey - the public key
 * @param tag - the protocol of the public key
 * @param feeRecipient - the address of the fee recipient. This is the fee recipient that must be persisted
 * @param feeRecipientValidator - the address of the validator of the fee recipient. This is the fee recipient that holds the truth but not the truth to be persisted
 * @param automaticImport - whether the public key was automatically imported
 */
export interface StakingBrainDb {
  [pubkey: string]: PubkeyDetails;
}

export interface StakingBrainDbUpdate {
  [pubkey: string]: Omit<PubkeyDetails, "automaticImport" | "tag">;
}

export interface CustomValidators extends PubkeyDetails {
  pubkey: string;
}

export interface PubkeyDetails {
  tag: Tag;
  feeRecipient: string;
  automaticImport: boolean;
  index?: number; // index of the validator. Only available if the validator is active.
}

export const nonEditableFeeRecipientTags = ["rocketpool", "stader", "stakewise", "lido"] as const;

export type NonEditableFeeRecipientTag = (typeof nonEditableFeeRecipientTags)[number];

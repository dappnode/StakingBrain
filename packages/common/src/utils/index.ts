import { nonEditableFeeRecipientTags, Tag, tags } from "../types/db/types.js";

export function isValidEcdsaPubkey(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidBlsPubkey(pubkey: string): boolean {
  return /^0x[a-fA-F0-9]{96}$/.test(pubkey);
}

export function isValidWithdrawableBlsAddress(address: string): boolean {
  return /^0x01[a-fA-F0-9]{64}$/.test(address);
}

export function isValidNonWithdrawableBlsAddress(address: string): boolean {
  return /^0x00[a-fA-F0-9]{64}$/.test(address);
}

export function isValidTag(tag: Tag): boolean {
  return tags.includes(tag);
}

export function isFeeRecipientEditable(tag: Tag): boolean {
  return !nonEditableFeeRecipientTags.some((t) => t === tag);
}

export function areAllFeeRecipientsEditable(tags: Tag[]): boolean {
  return tags.every((tag) => isFeeRecipientEditable(tag));
}

/**
 * Prefix pubkey with 0x if not already prefixed
 *
 * The standard is to prefix with 0x. The keystores JSON contains the pubkey without 0x.
 *
 * @param pubkey
 * @returns prefixed pubkey
 * @example
 * prefix0xPubkey("0x1234") => "0x1234"
 */
export function prefix0xPubkey(pubkey: string): string {
  return pubkey.startsWith("0x") ? pubkey : "0x" + pubkey;
}

export const shortenPubkey = (key: string | undefined): string => {
  if (!key) return "";
  let prefix = "";
  let end = 4;
  if (!key.startsWith("0x")) {
    prefix = `0x`;
  } else {
    end = 6;
  }
  return `${prefix}${key.substring(0, end)}...${key.substring(
    key.length - 4,
    key.length
  )}`;
};

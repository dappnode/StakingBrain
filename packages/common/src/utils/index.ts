export type ActionRequestOrigin = "ui" | "api";

export const tags = ["obol", "diva", "ssv", "rocketpool", "stakewise", "stakehouse", "solo", "stader", "lido"] as const;

export const nonEditableFeeRecipientTags = ["rocketpool", "stader", "stakewise", "lido"] as const;

export type NonEditableFeeRecipientTag = (typeof nonEditableFeeRecipientTags)[number];

/**
 * Tag describes the protocol of the public key imported
 */
export type Tag = (typeof tags)[number];

export function isValidEcdsaPubkey(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidBlsPubkey(pubkey: string): boolean {
  return /^0x[a-fA-F0-9]{96}$/.test(pubkey);
}

export function isValidWithdrawableBlsAddress(address: string): boolean {
  return /^0x01[0]{22}[a-fA-F0-9]{40}$/.test(address);
}

export function isValidNonWithdrawableBlsAddress(address: string): boolean {
  return /^0x00[a-fA-F0-9]{62}$/.test(address);
}

export function isFeeRecipientEditable(tag: Tag, requestOrigin?: ActionRequestOrigin): boolean {
  if (requestOrigin === "api") return true;

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
  return `${prefix}${key.substring(0, end)}...${key.substring(key.length - 4, key.length)}`;
};

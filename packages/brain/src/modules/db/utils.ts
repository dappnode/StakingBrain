import { Tag, tags } from "@stakingbrain/common";

export function isValidTag(tag: Tag): boolean {
  return tags.includes(tag);
}

/** Map lowercase pubkeys to their stored spelling; clients do not agree on hex casing. */
export function storedPubkeys(data: object): Map<string, string> {
  return new Map(Object.keys(data).map((pubkey) => [pubkey.toLowerCase(), pubkey]));
}

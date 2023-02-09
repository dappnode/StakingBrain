import { Tag, tags } from "../types/db/types.js";

export function isValidEcdsaPubkey(address: string): boolean {
  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) return false;
  return true;
}

export function isValidBlsPubkey(pubkey: string): boolean {
  if (!pubkey.match(/^0x[a-fA-F0-9]{96}$/)) return false;
  return true;
}

export function isValidTag(tag: Tag): boolean {
  if (!tags.includes(tag)) return false;
  return true;
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

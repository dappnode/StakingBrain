import { Tag, tags } from "../../types/db/types.js";

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

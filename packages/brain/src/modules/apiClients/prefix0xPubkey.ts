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

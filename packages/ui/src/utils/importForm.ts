import { BURN_ADDRESS, isFeeRecipientEditable, isValidEcdsaPubkey } from "@stakingbrain/common";
import type { Tag } from "@stakingbrain/common";
import type { KeystoreInfo } from "../types.js";

export interface ImportFormState {
  acceptedFiles: KeystoreInfo[];
  passwords: string[];
  tags: (Tag | "")[];
  feeRecipients: string[];
}

export function appendImportFiles(
  current: ImportFormState,
  incoming: KeystoreInfo[],
  shared: { password: boolean; tag: boolean; feeRecipient: boolean }
): ImportFormState {
  const seen = new Set(current.acceptedFiles.map(({ pubkey }) => pubkey.toLowerCase()));
  const additions = incoming.filter(({ pubkey }) => {
    const key = pubkey.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    acceptedFiles: [...current.acceptedFiles, ...additions],
    passwords: [...current.passwords, ...additions.map(() => (shared.password ? (current.passwords[0] ?? "") : ""))],
    tags: [...current.tags, ...additions.map(() => (shared.tag ? (current.tags[0] ?? "") : ""))],
    feeRecipients: [
      ...current.feeRecipients,
      ...additions.map(() => (shared.feeRecipient ? (current.feeRecipients[0] ?? "") : ""))
    ]
  };
}

export function isImportFormValid({ acceptedFiles, passwords, tags, feeRecipients }: ImportFormState): boolean {
  return (
    acceptedFiles.length > 0 &&
    acceptedFiles.every((_, index) => {
      const tag = tags[index];
      return (
        typeof passwords[index] === "string" &&
        passwords[index].length > 0 &&
        !!tag &&
        (!isFeeRecipientEditable(tag) ||
          (isValidEcdsaPubkey(feeRecipients[index]) && feeRecipients[index] !== BURN_ADDRESS))
      );
    })
  );
}

import type { CustomImportRequest } from "@stakingbrain/brain";
import type { Tag } from "@stakingbrain/common";
import type { KeystoreInfo } from "../types.js";

export async function createImportRequest({
  acceptedFiles,
  passwords,
  tags,
  feeRecipients,
  slashingFile
}: {
  acceptedFiles: KeystoreInfo[];
  passwords: string[];
  tags: Tag[];
  feeRecipients: string[];
  slashingFile?: File;
}): Promise<CustomImportRequest> {
  // Send JSON contents as text to avoid one Socket.IO binary attachment per file.
  return {
    importFrom: "ui",
    slashing_protection: await slashingFile?.text(),
    validatorsImportRequest: await Promise.all(
      acceptedFiles.map(async ({ file }, index) => ({
        keystore: await file.text(),
        password: passwords[index],
        tag: tags[index],
        feeRecipient: feeRecipients[index]
      }))
    )
  };
}

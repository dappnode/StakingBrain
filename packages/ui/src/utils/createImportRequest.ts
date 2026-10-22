import type { CustomImportRequest } from "@stakingbrain/brain";
import { isImportFormValid, ImportFormState } from "./importForm.js";

export async function createImportRequest({
  acceptedFiles,
  passwords,
  tags,
  feeRecipients,
  slashingFile
}: ImportFormState & {
  slashingFile?: File;
}): Promise<CustomImportRequest> {
  if (!isImportFormValid({ acceptedFiles, passwords, tags, feeRecipients }))
    throw new Error("Provide a password, protocol and valid fee recipient for every validator");
  // Send JSON contents as text to avoid one Socket.IO binary attachment per file.
  return {
    importFrom: "ui",
    slashing_protection: await slashingFile?.text(),
    validatorsImportRequest: await Promise.all(
      acceptedFiles.map(async ({ file }, index) => {
        const tag = tags[index];
        if (!tag) throw new Error("Select a protocol for every validator");
        return {
          keystore: await file.text(),
          password: passwords[index],
          tag,
          feeRecipient: feeRecipients[index]
        };
      })
    )
  };
}

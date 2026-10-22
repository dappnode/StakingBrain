import { expect } from "chai";
import { appendImportFiles, isImportFormValid, ImportFormState } from "../src/utils/importForm.js";
import { createImportRequest } from "../src/utils/createImportRequest.js";
import { extractPubkey } from "../src/utils/dataUtils.js";

const recipient = "0x" + "ab".repeat(20);
const files = ["11", "22", "33"].map((byte) => {
  const pubkey = "0x" + byte.repeat(48);
  return { pubkey, file: new File([JSON.stringify({ pubkey: pubkey.slice(2) })], `${byte}.json`) };
});
const shared = { password: true, tag: true, feeRecipient: true };
const initial = (): ImportFormState => ({
  acceptedFiles: [files[0]],
  passwords: ["password"],
  tags: ["solo"],
  feeRecipients: [recipient]
});

describe("Bulk import form", () => {
  it("inherits shared settings for later file drops and imports every selected key", async () => {
    const state = appendImportFiles(appendImportFiles(initial(), [files[1]], shared), [files[2]], shared);
    const request = await createImportRequest(state);
    expect(
      request.validatorsImportRequest.map(({ password, tag, feeRecipient }) => ({ password, tag, feeRecipient }))
    ).to.deep.equal(files.map(() => ({ password: "password", tag: "solo", feeRecipient: recipient })));
    expect(request.validatorsImportRequest.map(({ keystore }) => JSON.parse(keystore).pubkey)).to.deep.equal(
      files.map(({ pubkey }) => pubkey.slice(2))
    );
  });

  it("deduplicates keys within a drop and against previous drops", () => {
    const state = appendImportFiles(initial(), [files[0], files[1], files[1]], shared);
    expect(state.acceptedFiles.map(({ pubkey }) => pubkey)).to.deep.equal(
      files.slice(0, 2).map(({ pubkey }) => pubkey)
    );
    expect(state.passwords).to.have.length(2);
    expect(state.tags).to.have.length(2);
    expect(state.feeRecipients).to.have.length(2);
  });

  it("requires individual settings for newly added files when shared switches are off", () => {
    const state = appendImportFiles(initial(), [files[1]], { password: false, tag: false, feeRecipient: false });
    expect(isImportFormValid(state)).to.equal(false);
    expect(state.passwords).to.deep.equal(["password", ""]);
    expect(state.tags).to.deep.equal(["solo", ""]);
  });

  it("does not allow sparse or shortened settings arrays to bypass validation", () => {
    for (const field of ["passwords", "tags", "feeRecipients"] as const) {
      const state = appendImportFiles(initial(), [files[1]], shared);
      delete state[field][0];
      expect(isImportFormValid(state), field).to.equal(false);
      state[field] = [];
      expect(isImportFormValid(state), field).to.equal(false);
    }
    expect(isImportFormValid({ ...initial(), feeRecipients: ["0x" + "00".repeat(20)] })).to.equal(false);
  });

  it("rejects invalid keystores and normalizes valid public keys", async () => {
    const key = "ab".repeat(48);
    expect(await extractPubkey(new File([JSON.stringify({ pubkey: key.toUpperCase() })], "key.json"))).to.equal(
      "0x" + key
    );
    for (const contents of ["{", "null", "{}", '{"pubkey":123}', '{"pubkey":"abc"}']) {
      const result = await extractPubkey(new File([contents], "invalid.json")).catch((error: Error) => error);
      expect(result).to.be.instanceOf(Error);
    }
  });
});

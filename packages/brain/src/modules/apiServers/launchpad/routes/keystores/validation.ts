import { isValidBlsPubkey } from "@stakingbrain/common";
import type { BrainKeystoreImportRequest } from "../../types.js";
import type { Web3signerDeleteRequest } from "../../../../apiClients/types.js";

export function validateImportKeystoresRequestBody(request: BrainKeystoreImportRequest): void {
  // Check if the request contains keystores
  if (!request.keystores || !Array.isArray(request.keystores) || request.keystores.length === 0) {
    throw new Error("Keystores array is required and must not be empty.");
  }

  // Check if the request contains passwords
  if (!request.passwords || !Array.isArray(request.passwords) || request.passwords.length === 0) {
    throw new Error("Passwords array is required and must not be empty.");
  }

  // Check if the request contains tags
  if (!request.tags || !Array.isArray(request.tags) || request.tags.length === 0) {
    throw new Error("Tags array is required and must not be empty.");
  }

  // Check if the request contains fee recipients
  if (!request.feeRecipients || !Array.isArray(request.feeRecipients) || request.feeRecipients.length === 0) {
    throw new Error("Fee recipients array is required and must not be empty.");
  }

  // Check if the lengths of all arrays are consistent
  const { keystores, passwords, tags, feeRecipients } = request;
  const arrays = [keystores, passwords, tags, feeRecipients];
  if (arrays.some((arr) => arr.length !== keystores.length)) {
    throw new Error("All arrays (keystores, passwords, tags, fee recipients) must have the same length.");
  }
}

export function validateDeleteRequestBody(deleteReq: Web3signerDeleteRequest): void {
  const { pubkeys } = deleteReq;

  if (!pubkeys) {
    throw new Error("pubkeys parameter is required.");
  } else if (!Array.isArray(pubkeys)) {
    throw new Error("pubkeys must be an array of strings.");
  } else {
    const invalidPubkeys = pubkeys.filter((pubkey) => !isValidBlsPubkey(pubkey));
    if (invalidPubkeys.length > 0) {
      throw new Error(
        `Invalid pubkey format: ${invalidPubkeys.join(", ")}. Pubkeys should follow BLS format (beginning with 0x)`
      );
    }
  }
}

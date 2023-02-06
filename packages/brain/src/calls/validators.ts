import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerPostRequest,
  CustomValidatorsImportRequest,
  Web3signerPostResponse,
  CustomValidatorGetResponse,
} from "@stakingbrain/common";
import { brainDb, signerApi, signerUrl, validatorApi } from "../index.js";
import logger from "../modules/logger/index.js";

/**
 * Import keystores:
 * 1. Import keystores + passwords on web3signer API
 * 2. Import pubkeys on validator API
 * 3. Import feeRecipient on Validator API
 * 4. Write on db
 * @param postRequest
 * @returns Web3signerPostResponse t
 */
export async function importValidators(
  postRequest: CustomValidatorsImportRequest
): Promise<Web3signerPostResponse> {
  // 0. Check if already exists?
  function readFile(files: File[]): string[] {
    const fileContents: string[] = [];
    // Type File is from the web, cast it to Buffer
    for (const file of files as unknown as Buffer[])
      fileContents.push(file.toString());
    return fileContents;
  }

  const keystores = readFile(postRequest.keystores as File[]);

  let importSignerData: Web3signerPostRequest;
  if (postRequest.slashing_protection) {
    importSignerData = {
      keystores,
      passwords: postRequest.passwords,
      slashing_protection: readFile([postRequest.slashing_protection])[0],
    };
  } else {
    importSignerData = {
      keystores,
      passwords: postRequest.passwords,
    };
  }
  // 1. Import keystores and passwords on web3signer API
  const web3signerPostResponse: Web3signerPostResponse =
    await signerApi.importKeystores(importSignerData);

  const pubkeys: string[] = keystores.map(
    (keystore) => JSON.parse(keystore).pubkey
  );

  // 2. Write on db
  brainDb.addPubkeys({
    pubkeys,
    tags: postRequest.tags,
    feeRecipients: postRequest.feeRecipients,
  });

  // 3. Import pubkeys on validator API
  await validatorApi
    .postRemoteKeys({
      remote_keys: pubkeys.map((pubkey) => ({
        pubkey,
        url: signerUrl,
      })),
    })
    .catch((err) => {
      logger.error(`Posting validator pubkeys`, err);
    });

  // 4. Import feeRecipient on Validator API
  for (const [index, pubkey] of pubkeys.entries())
    await validatorApi
      .setFeeRecipient(postRequest.feeRecipients[index], pubkey)
      .catch((err) => {
        logger.error(`Posting validator feeRecipient`, err);
        // Set fee recipient to empty string if error
        postRequest.feeRecipients[index] = "";
      });

  return web3signerPostResponse;
}

/**
 * Delete keystores:
 * 1. Delete keystores on web3signer API
 * 2. Delete pubkeys on validator API
 * 3. Delete feeRecipient on Validator API
 * 4. Write on db
 * @param deleteRequest
 * @returns
 */
export async function deleteValidators(
  deleteRequest: Web3signerDeleteRequest
): Promise<Web3signerDeleteResponse> {
  //  1. Delete keystores on web3signer API
  const web3signerDeleteResponse = await signerApi.deleteKeystores(
    deleteRequest
  );
  // 2. Delete pubkeys on validator API
  await validatorApi.deleteRemoteKeys(deleteRequest).catch((err) => {
    logger.error(`on deleting validator pubkeys`, err);
  });
  // 3. Delete feeRecipient on Validator API
  for (const pubkey of deleteRequest.pubkeys)
    await validatorApi.deleteFeeRecipient(pubkey).catch((err) => {
      logger.error(`on deleting validator feeRecipient`, err);
    });
  // 4. Write on db
  brainDb.deletePubkeys(deleteRequest.pubkeys);

  return web3signerDeleteResponse;
}

/**
 * Get keystores
 * 1. Get keystores on web3signer API
 * 2. Get pubkeys on validator API
 * 3. Get feeRecipient on Validator API
 * 4. Compare and Write on db
 * @returns
 */
export async function getValidators(): Promise<CustomValidatorGetResponse[]> {
  const data = brainDb.data;
  if (!data) return [];
  const validators: CustomValidatorGetResponse[] = [];
  for (const [pubkey, { tag, feeRecipient }] of Object.entries(data)) {
    validators.push({
      validating_pubkey: pubkey,
      tag,
      feeRecipient,
    });
  }
  return validators;
}

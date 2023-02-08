import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  Web3signerPostRequest,
  CustomValidatorsImportRequest,
  Web3signerPostResponse,
  CustomValidatorGetResponse,
  Tag,
} from "@stakingbrain/common";
import {
  brainDb,
  restartCron,
  signerApi,
  signerUrl,
  startCron,
  stopCron,
  validatorApi,
} from "../index.js";
import logger from "../modules/logger/index.js";

/**
 * Import keystores:
 * 1. Write on db
 * 2. Import keystores + passwords on web3signer API
 * 3. Import pubkeys on validator API
 * 4. Import feeRecipient on Validator API
 * @param postRequest
 * @returns Web3signerPostResponse
 */
export async function importValidators(
  postRequest: CustomValidatorsImportRequest
): Promise<Web3signerPostResponse> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are importing validators
    stopCron();

    // 0. Check if already exists?
    function readFile(files: File[]): string[] {
      const fileContents: string[] = [];
      // Type File is from the web, cast it to Buffer
      for (const file of files as unknown as Buffer[])
        fileContents.push(file.toString());
      return fileContents;
    }

    const keystores =
      postRequest.importFrom === "ui"
        ? readFile(postRequest.keystores as File[])
        : (postRequest.keystores as string[]);

    let importSignerData: Web3signerPostRequest;
    if (postRequest.slashing_protection) {
      importSignerData = {
        keystores,
        passwords: postRequest.passwords,
        slashing_protection:
          postRequest.importFrom === "ui"
            ? readFile([
                [postRequest.slashing_protection] as unknown as File,
              ])[0]
            : (postRequest.slashing_protection as string),
      };
    } else {
      importSignerData = {
        keystores,
        passwords: postRequest.passwords,
      };
    }

    const pubkeys: string[] = keystores.map(
      (keystore) => JSON.parse(keystore).pubkey
    );

    // 1. Write on db
    brainDb.addPubkeys({
      pubkeys,
      tags: postRequest.tags,
      feeRecipients: postRequest.feeRecipients,
    });
    logger.debug(`Added pubkeys to db: ${pubkeys.join(", ")}`);

    // 2. Import keystores and passwords on web3signer API
    const web3signerPostResponse: Web3signerPostResponse = await signerApi
      .importKeystores(importSignerData)
      .catch((err) => {
        brainDb.deletePubkeys(pubkeys);
        throw err;
      });

    logger.debug(
      `Imported keystores into web3signer API: ${JSON.stringify(
        web3signerPostResponse.data
      )}`
    );

    // 3. Import pubkeys on validator API
    await validatorApi
      .postRemoteKeys({
        remote_keys: pubkeys.map((pubkey) => ({
          pubkey,
          url: signerUrl,
        })),
      })
      .catch((err) => {
        logger.error(`Error setting validator pubkeys`, err);
      });
    logger.debug(`Added pubkeys to validator API`);

    // 4. Import feeRecipient on Validator API
    for (const [index, pubkey] of pubkeys.entries())
      await validatorApi
        .setFeeRecipient(postRequest.feeRecipients[index], pubkey)
        .then(() => logger.debug(`Added feeRecipient to validator API`))
        .catch((err) => {
          logger.error(`Error setting validator feeRecipient`, err);
          // TODO: write empty fee recipient on db
        });

    // IMPORTANT: start the cron
    startCron();
    return web3signerPostResponse;
  } catch (e) {
    restartCron();
    throw e;
  }
}

/**
 * Updates validators on DB:
 * 1. Write on db
 * 2. Import feeRecipient on Validator API
 * @param param0
 */
export async function updateValidators({
  pubkeys,
  feeRecipients,
  tags,
}: {
  pubkeys: string[];
  feeRecipients: string[];
  tags: Tag[];
}): Promise<void> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are importing validators
    stopCron();

    brainDb.updatePubkeys({
      pubkeys,
      tags,
      feeRecipients,
    });

    // Import feeRecipient on Validator API
    for (const [index, pubkey] of pubkeys.entries())
      await validatorApi
        .setFeeRecipient(feeRecipients[index], pubkey)
        .then(() => logger.debug(`Added feeRecipient to validator API`))
        .catch((err) =>
          logger.error(`Error setting validator feeRecipient`, err)
        );

    // IMPORTANT: start the cron
    startCron();
  } catch (e) {
    restartCron();
    throw e;
  }
}

/**
 * Delete keystores:
 * 1. Write on db
 * 2. Delete keystores on web3signer API
 * 3. Delete pubkeys on validator API
 * 4. Delete feeRecipient on Validator API
 * @param deleteRequest
 * @returns
 */
export async function deleteValidators(
  deleteRequest: Web3signerDeleteRequest
): Promise<Web3signerDeleteResponse> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are deleting validators
    stopCron();

    // Write on db
    brainDb.deletePubkeys(deleteRequest.pubkeys);
    // Delete keystores on web3signer API
    const web3signerDeleteResponse = await signerApi.deleteKeystores(
      deleteRequest
    );
    // Delete feeRecipient on Validator API
    for (const pubkey of deleteRequest.pubkeys)
      await validatorApi
        .deleteFeeRecipient(pubkey)
        .then(() => logger.debug(`Deleted fee recipient to validator API`))
        .catch((err) =>
          logger.error(`Error deleting validator feeRecipient`, err)
        );
    // Delete pubkeys on validator API
    await validatorApi
      .deleteRemoteKeys(deleteRequest)
      .then(() => logger.debug(`Deleted pubkeys to validator API}`))
      .catch((err) => logger.error(`Error deleting validator pubkeys`, err));

    // IMPORTANT: start the cron
    startCron();
    return web3signerDeleteResponse;
  } catch (e) {
    restartCron();
    throw e;
  }
}

/**
 * Get all validators from db
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

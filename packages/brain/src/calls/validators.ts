import {
  Web3signerDeleteRequest,
  Web3signerDeleteResponse,
  CustomValidatorUpdateRequest,
  CustomImportRequest,
  Web3signerPostResponse,
  CustomValidatorGetResponse,
  shortenPubkey,
  PubkeyDetails,
  Tag,
  prefix0xPubkey,
  ValidatorExitExecute,
  ValidatorExitGet,
  BeaconchainPoolVoluntaryExitsPostRequest,
} from "@stakingbrain/common";
import {
  beaconchainApi,
  brainDb,
  signerApi,
  signerUrl,
  validatorApi,
} from "../index.js";
import logger from "../modules/logger/index.js";
import { cron } from "../index.js";

/**
 * Import keystores:
 * 1. Import keystores + passwords on web3signer API
 * 2. Import pubkeys on validator API
 * 3. Import feeRecipient on Validator API
 * 4. Write on db must go last because if signerApi fails does not make sense to write on db since cron will not delete them at some point
 * @param postRequest
 * @returns Web3signerPostResponse
 */
export async function importValidators(
  postRequest: CustomImportRequest
): Promise<Web3signerPostResponse> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are importing validators
    cron.stop();

    const validators = postRequest.validatorsImportRequest.map((validator) => {
      const keystore = validator.keystore.toString();
      const pubkey: string = JSON.parse(keystore).pubkey;
      return {
        keystore,
        password: validator.password,
        tag: validator.tag,
        feeRecipient: validator.feeRecipient,
        pubkey,
      };
    });

    const validatorsToPost: {
      keystore: string;
      password: string;
      tag: Tag;
      feeRecipient: string;
      pubkey: string;
    }[] = [];

    // Import keystores and passwords on web3signer API
    const web3signerPostResponse = await signerApi.importKeystores({
      keystores: validators.map((validator) => validator.keystore),
      passwords: validators.map((validator) => validator.password),
      slashing_protection: postRequest.slashing_protection
        ? postRequest.slashing_protection.toString()
        : undefined,
    });

    logger.debug(
      `Imported keystores into web3signer API: ${JSON.stringify(
        web3signerPostResponse.data
      )}`
    );

    // Signer API import keystore may fail for some keystores, but not all
    // @see https://github.com/ConsenSys/web3signer/issues/713
    // Remove the pubkeys to avoid adding them to the db
    const pubkeysToPostIterator = validators
      .map((validator) => validator.pubkey)
      .entries();

    //Iterate over pubkeysToPost with index and pubkey
    for (const [index, pubkey] of pubkeysToPostIterator) {
      if (web3signerPostResponse.data[index].status === "error") {
        web3signerPostResponse.data[index].message +=
          ". Check that the keystore file format is valid and the password is correct.";
        logger.error(
          `Error importing keystore for pubkey ${shortenPubkey(pubkey)}: ${
            web3signerPostResponse.data[index].message
          }`
        );
      } else if (web3signerPostResponse.data[index].status === "duplicate") {
        logger.warn(`Duplicate keystore for pubkey ${shortenPubkey(pubkey)}`);
      } else if (web3signerPostResponse.data[index].status === "imported") {
        validatorsToPost.push(validators[index]);
      }
    }

    if (validatorsToPost.length === 0) {
      cron.start();
      return web3signerPostResponse;
    }

    // Import pubkeys on validator API
    await validatorApi
      .postRemoteKeys({
        remote_keys: validatorsToPost.map((validator) => ({
          pubkey: validator.pubkey,
          url: signerUrl,
        })),
      })
      .catch((err) => logger.error(`Error setting validator pubkeys`, err));

    logger.debug(`Added pubkeys to validator API`);

    // Import feeRecipient on Validator API
    for (const validator of validatorsToPost) {
      console.log("pubkey to set feeRecipient", validator.pubkey);

      await validatorApi
        .setFeeRecipient(validator.feeRecipient, validator.pubkey)
        .catch((err) =>
          logger.error(
            `Error setting validator feeRecipient for pubkey ${validator.pubkey} :`,
            err
          )
        );
    }

    logger.debug(`Added fee recipients to validator API`);

    const validatorsToDb = {
      validators: validatorsToPost.reduce((acc, validator) => {
        acc[prefix0xPubkey(validator.pubkey)] = {
          tag: validator.tag,
          feeRecipient: validator.feeRecipient,
          automaticImport: postRequest.importFrom !== "ui",
        };
        return acc;
      }, {} as { [pubkey: string]: PubkeyDetails }),
    };

    // Write on db
    brainDb.addValidators(validatorsToDb);

    logger.debug(
      `Written on db: ${validatorsToPost.map((v) => v.pubkey).join(", ")}`
    );

    // IMPORTANT: start the cron
    cron.start();
    return web3signerPostResponse;
  } catch (e) {
    cron.restart();
    throw e;
  }
}

/**
 * Updates validators on DB:
 * 1. Write on db MUST goes first because if signerApi fails, cron will try to delete them
 * 2. Import feeRecipient on Validator API
 * @param param0
 */
export async function updateValidators(
  customValidatorUpdateRequest: CustomValidatorUpdateRequest[]
): Promise<void> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are importing validators
    cron.stop();

    brainDb.updateValidators({
      validators: customValidatorUpdateRequest.reduce((acc, validator) => {
        acc[validator.pubkey] = {
          feeRecipient: validator.feeRecipient,
        };
        return acc;
      }, {} as { [pubkey: string]: Omit<PubkeyDetails, "automaticImport" | "tag"> }),
    });

    // Import feeRecipient on Validator API
    for (const validator of customValidatorUpdateRequest)
      await validatorApi
        .setFeeRecipient(validator.feeRecipient, validator.pubkey)
        .then(() => logger.debug(`Added feeRecipient to validator API`))
        .catch((err) =>
          logger.error(`Error setting validator feeRecipient`, err)
        );

    // IMPORTANT: start the cron
    cron.start();
  } catch (e) {
    cron.restart();
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
    cron.stop();

    // Delete feeRecipient on Validator API
    for (const pubkey of deleteRequest.pubkeys)
      await validatorApi
        .deleteFeeRecipient(pubkey)
        .then(() => logger.debug(`Deleted fee recipient in validator API`))
        .catch((err) =>
          logger.error(`Error deleting validator feeRecipient`, err)
        );
    // Delete pubkeys on validator API
    await validatorApi
      .deleteRemoteKeys(deleteRequest)
      .then(() => logger.debug(`Deleted pubkeys in validator API`))
      .catch((err) => logger.error(`Error deleting validator pubkeys`, err));

    // Delete keystores on web3signer API
    const web3signerDeleteResponse = await signerApi.deleteKeystores(
      deleteRequest
    );

    // Write on db
    brainDb.deleteValidators(deleteRequest.pubkeys);

    // IMPORTANT: start the cron
    cron.start();
    return web3signerDeleteResponse;
  } catch (e) {
    cron.restart();
    throw e;
  }
}

/**
 * Get all validators from db
 * If running in development mode (NODE_ENV === "development") it will returns booleans for
 * validatorImported and validatorFeeRecipientCorrect checks from the validator API
 * @returns
 */
export async function getValidators(): Promise<CustomValidatorGetResponse[]> {
  const data = brainDb.data;
  if (!data) return [];

  const validatorPubkeys = (
    await validatorApi.getRemoteKeys().catch((e) => {
      logger.error(e);
      return { data: [] };
    })
  ).data.map((validator) => validator.pubkey);

  const signerPubkeys = (
    await signerApi.getKeystores().catch((e) => {
      logger.error(e);
      return { data: [] };
    })
  ).data.map((key) => key.validating_pubkey);

  const validatorsFeeRecipients = await Promise.all(
    validatorPubkeys.map((pubkey) => validatorApi.getFeeRecipient(pubkey))
  ).catch((e) => {
    logger.error(e);
    return [];
  });

  const validators: CustomValidatorGetResponse[] = [];
  for (const [pubkey, { tag, feeRecipient }] of Object.entries(data))
    validators.push({
      pubkey,
      tag,
      feeRecipient,
      validatorImported: validatorPubkeys.includes(pubkey),
      signerImported: signerPubkeys.includes(pubkey),
      validatorFeeRecipientCorrect: validatorsFeeRecipients.some(
        (feeRecipient) => feeRecipient === feeRecipient
      ),
    });

  return validators;
}

/**
 * Get exit validators info signed
 * @param pubkeys The public keys of the validators to exit
 * @returns The exit data signed of each validator
 */
export async function getExitValidators({
  pubkeys,
}: {
  pubkeys: string[];
}): Promise<BeaconchainPoolVoluntaryExitsPostRequest[]> {
  const validatorsExit = await _getExitValidators(pubkeys);
  logger.debug(validatorsExit);
  return validatorsExit;
}

/**
 * Performs a voluntary exit for a given set of validators as identified via `pubkeys`
 * @param pubkeys The public keys of the validators to exit
 * @returns The exit status of each validator
 */
export async function exitValidators({
  pubkeys,
}: {
  pubkeys: string[];
}): Promise<ValidatorExitExecute[]> {
  const validatorsToExit = await _getExitValidators(pubkeys);
  const exitValidatorsResponses: ValidatorExitExecute[] = [];
  for (const validatorToExit of validatorsToExit) {
    try {
      await beaconchainApi.postVoluntaryExits({
        postVoluntaryExitsRequest: {
          message: {
            epoch: validatorToExit.message.epoch,
            validator_index: validatorToExit.message.validator_index,
          },
          signature: validatorToExit.signature,
        },
      });
      exitValidatorsResponses.push({
        pubkey: validatorToExit.pubkey,
        status: {
          exited: true,
          message: "Successfully exited validator",
        },
      });
    } catch (e) {
      exitValidatorsResponses.push({
        pubkey: validatorToExit.pubkey,
        status: {
          exited: false,
          message: `Error exiting validator ${e.message}`,
        },
      });
    }
  }

  const exitedValidatorsPubkeys = exitValidatorsResponses
    .filter((validator) => validator.status.exited === true)
    .map((validator) => validator.pubkey);

  // Delete the validator from the validator API
  await validatorApi
    .deleteRemoteKeys({ pubkeys: exitedValidatorsPubkeys })
    .then(() => logger.debug(`Deleted pubkeys in validator API`))
    .catch((err) => logger.error(`Error deleting validator pubkeys`, err));

  // Delete the validator from the web3signer API
  await signerApi
    .deleteKeystores({ pubkeys: exitedValidatorsPubkeys })
    .then(() => logger.debug(`Deleted pubkeys in web3signer API`));

  // Delete the validator from the brain db
  brainDb.deleteValidators(exitedValidatorsPubkeys);

  return exitValidatorsResponses;
}

/**
 * Get exit validators info
 * @param pubkeys The public keys of the validators to exit
 * @returns The exit validators info signed
 */
async function _getExitValidators(
  pubkeys: string[]
): Promise<ValidatorExitGet[]> {
  // Get the current epoch from the beaconchain API to exit the validators
  const currentEpoch = await beaconchainApi.getCurrentEpoch();

  // Get the fork from the beaconchain API to sign the voluntary exit
  const fork = await beaconchainApi.getForkFromState({ state_id: "head" });

  // Get the genesis from the beaconchain API to sign the voluntary exit
  const genesis = await beaconchainApi.getGenesis();

  // Get the validators indexes from the validator API
  const validatorPubkeysIndexes = (
    await Promise.all(
      pubkeys.map((pubkey) =>
        beaconchainApi.getValidatorFromState({ state: "head", pubkey })
      )
    )
  ).map((validator) => {
    return {
      pubkey: validator.data.validator.pubkey,
      index: validator.data.index,
    };
  });

  const validatorsExit: ValidatorExitGet[] = [];
  for (const validatorIndex of validatorPubkeysIndexes) {
    const validatorSignature = await signerApi.signVoluntaryExit({
      signerVoluntaryExitRequest: {
        type: "VOLUNTARY_EXIT",
        fork_info: {
          fork: {
            previous_version: fork.data.previous_version,
            current_version: fork.data.current_version,
            epoch: fork.data.epoch,
          },
          genesis_validators_root: genesis.data.genesis_validators_root,
        },
        voluntary_exit: {
          epoch: currentEpoch.toString(),
          validator_index: validatorIndex.index,
        },
      },
      pubkey: validatorIndex.pubkey,
    });
    validatorsExit.push({
      pubkey: validatorIndex.pubkey,
      message: {
        epoch: currentEpoch.toString(),
        validator_index: validatorIndex.index,
      },
      signature: validatorSignature,
    });
  }

  return validatorsExit;
}

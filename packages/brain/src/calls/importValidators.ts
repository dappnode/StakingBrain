import {
  CustomImportRequest,
  Web3signerPostResponse,
  isFeeRecipientEditable,
  NonEditableFeeRecipientTag,
  Tag,
  shortenPubkey,
  prefix0xPubkey,
  PubkeyDetails,
  Network,
  rocketPoolFeeRecipient,
} from "@stakingbrain/common";
import {
  cron,
  network,
  signerApi,
  validatorApi,
  signerUrl,
  brainDb,
} from "../index.js";
import logger from "../modules/logger/index.js";
import { StakeHouseSDK } from "../modules/stakingProtocols/stakehouse/index.js";

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

    const validators = [];
    for (const validator of postRequest.validatorsImportRequest) {
      const keystore = validator.keystore.toString();
      const pubkey = JSON.parse(keystore).pubkey;

      const feeRecipient =
        network !== "gnosis" && !isFeeRecipientEditable(validator.tag)
          ? await getNonEditableFeeRecipient(
              pubkey,
              validator.tag as NonEditableFeeRecipientTag,
              network
            )
          : validator.feeRecipient;

      validators.push({
        keystore,
        password: validator.password,
        tag: validator.tag,
        feeRecipient,
        pubkey,
      });

      validators.push({
        keystore,
        password: validator.password,
        tag: validator.tag,
        feeRecipient,
        pubkey,
      });
    }

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

async function getNonEditableFeeRecipient<T extends Omit<Network, "gnosis">>(
  pubkey: string,
  tag: NonEditableFeeRecipientTag,
  network: T
): Promise<string> {
  switch (tag) {
    case "rocketpool":
      return rocketPoolFeeRecipient;
    case "stakehouse":
      return await new StakeHouseSDK().getLsdFeeRecipient(pubkey);
    default:
      throw new Error("Fee recipient not found for tag: " + tag);
  }
}

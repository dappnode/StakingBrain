import {
  isFeeRecipientEditable,
  NonEditableFeeRecipientTag,
  Tag,
  shortenPubkey,
  prefix0xPubkey,
  Network,
  ROCKET_POOL_FEE_RECIPIENT,
  STADER_POOL_FEE_RECIPIENT_MAINNET,
  STADER_POOL_FEE_RECIPIENT_PRATER,
  LIDO_FEE_RECIPIENT_HOLESKY,
  LIDO_FEE_RECIPIENT_MAINNET
} from "@stakingbrain/common";
import { CustomImportRequest } from "./types.js";
import { CronJob } from "../../../cron/cron.js";
import { BrainDataBase } from "../../../db/index.js";
import { Web3signerPostResponse } from "../../../apiClients/types.js";
import { PubkeyDetails } from "../../../db/types.js";
import logger from "../../../logger/index.js";
import { Web3SignerApi, ValidatorApi } from "../../../apiClients/index.js";

type ValidatorImportRequest = {
  keystore: string;
  password: string;
  tag: Tag;
  feeRecipient: string;
  pubkey: string;
};

/**
 * Import keystores:
 * 1. Import keystores + passwords on web3signer API
 * 2. Import pubkeys on validator API
 * 3. Import feeRecipient on Validator API
 * 4. Write on db must go last because if signerApi fails does not make sense to write on db since cron will not delete them at some point
 * @param postRequest
 * @returns Web3signerPostResponse
 */
export async function importValidators({
  postRequest,
  reloadValidatorsCronTask,
  network,
  signerApi,
  validatorApi,
  signerUrl,
  brainDb
}: {
  postRequest: CustomImportRequest;
  reloadValidatorsCronTask: CronJob;
  network: Network;
  signerApi: Web3SignerApi;
  validatorApi: ValidatorApi;
  signerUrl: string;
  brainDb: BrainDataBase;
}): Promise<Web3signerPostResponse> {
  try {
    // IMPORTANT: stop the cron. This removes the scheduled cron task from the task queue
    // and prevents the cron from running while we are importing validators
    reloadValidatorsCronTask.stop();

    const validators: ValidatorImportRequest[] = [];
    const validatorsToPost: ValidatorImportRequest[] = [];
    const wrongFeeRecipientResponse: {
      status: "error";
      message: string;
    }[] = [];

    for (const validator of postRequest.validatorsImportRequest) {
      const keystore = validator.keystore.toString();
      const pubkey = JSON.parse(keystore).pubkey;

      try {
        const feeRecipient =
          !["gnosis", "lukso"].includes(network) && !isFeeRecipientEditable(validator.tag, postRequest.importFrom)
            ? getNonEditableFeeRecipient(validator.tag as NonEditableFeeRecipientTag, network, validator.feeRecipient)
            : validator.feeRecipient;

        logger.info(`Setting ${feeRecipient} as fee recipient for ${pubkey}`);

        validators.push({
          keystore,
          password: validator.password,
          tag: validator.tag,
          feeRecipient: feeRecipient,
          pubkey
        });
      } catch (e) {
        wrongFeeRecipientResponse.push({
          status: "error",
          message: `Could not obtain fee recipient for pubkey ${shortenPubkey(
            pubkey
          )}. ${e} You can force a specific fee recipient by selecting tag "solo", but for some protocols this might cause you to lose rewards if you set a wrong address.`
        });

        logger.error(`Error obtaining fee recipient for pubkey ${shortenPubkey(pubkey)}: ${e}`);
      }
    }

    // Import keystores and passwords on web3signer API
    const web3signerPostResponse = await signerApi.importRemoteKeys({
      keystores: validators.map((validator) => validator.keystore),
      passwords: validators.map((validator) => validator.password),
      slashing_protection: postRequest.slashing_protection ? postRequest.slashing_protection.toString() : undefined
    });

    logger.debug(`Imported keystores into web3signer API: ${JSON.stringify(web3signerPostResponse.data)}`);

    // Signer API import keystore may fail for some keystores, but not all
    // @see https://github.com/ConsenSys/web3signer/issues/713
    // Remove the pubkeys to avoid adding them to the db
    const pubkeysToPostIterator = validators.map((validator) => validator.pubkey).entries();

    //Iterate over pubkeysToPost with index and pubkey
    for (const [index, pubkey] of pubkeysToPostIterator) {
      const postStatus = web3signerPostResponse.data[index].status;

      if (postStatus === "error") {
        web3signerPostResponse.data[index].message +=
          ". Check that the keystore file format is valid and the password is correct.";
        logger.error(
          `Error importing keystore for pubkey ${shortenPubkey(pubkey)}: ${web3signerPostResponse.data[index].message}`
        );
      } else if (postStatus === "duplicate") {
        logger.warn(`Duplicate keystore for pubkey ${shortenPubkey(pubkey)}`);
      } else if (postStatus === "imported") {
        validatorsToPost.push(validators[index]);
      }
    }

    // Add info about the wrong fee recipients to the response
    web3signerPostResponse.data.push(...wrongFeeRecipientResponse);

    if (validatorsToPost.length === 0) {
      reloadValidatorsCronTask.start();
      return web3signerPostResponse;
    }

    // Import pubkeys on validator API
    await validatorApi
      .postRemoteKeys({
        remote_keys: validatorsToPost.map((validator) => ({
          pubkey: validator.pubkey,
          url: signerUrl
        }))
      })
      .catch((err) => logger.error(`Error setting validator pubkeys`, err));

    logger.debug(`Added pubkeys to validator API`);

    // Import feeRecipient on Validator API
    for (const validator of validatorsToPost) {
      console.log("pubkey to set feeRecipient", validator.pubkey);

      await validatorApi
        .setFeeRecipient(validator.feeRecipient, validator.pubkey)
        .catch((err) => logger.error(`Error setting validator feeRecipient for pubkey ${validator.pubkey} :`, err));
    }

    logger.debug(`Added fee recipients to validator API`);

    const validatorsToDb = {
      validators: validatorsToPost.reduce(
        (acc, validator) => {
          acc[prefix0xPubkey(validator.pubkey)] = {
            tag: validator.tag,
            feeRecipient: validator.feeRecipient,
            automaticImport: postRequest.importFrom !== "ui"
          };
          return acc;
        },
        {} as { [pubkey: string]: PubkeyDetails }
      )
    };

    // Write on db
    brainDb.addValidators(validatorsToDb);

    logger.debug(`Written on db: ${validatorsToPost.map((v) => v.pubkey).join(", ")}`);

    // IMPORTANT: start the cron
    reloadValidatorsCronTask.start();
    return web3signerPostResponse;
  } catch (e) {
    reloadValidatorsCronTask.restart();
    throw e;
  }
}

function getNonEditableFeeRecipient(
  tag: NonEditableFeeRecipientTag,
  network: Network,
  suggestedFeeRecipient?: string
): string {
  if (network == "gnosis") throw Error("Currently, there are no DVT/LSDs supported on Gnosis chain in Dappnode.");
  if (network == "lukso") throw Error("Currently, there are no DVT/LSDs supported on Lukso chain in Dappnode.");

  switch (tag) {
    case "rocketpool":
      return ROCKET_POOL_FEE_RECIPIENT;

    case "lido":
      if (network === "mainnet") return LIDO_FEE_RECIPIENT_MAINNET;
      else if (network === "holesky") return LIDO_FEE_RECIPIENT_HOLESKY;
      else throw Error(`Fee recipient not found for tag: ${tag} and network: ${network}`);

    // Stader FR cannot be known in advance
    case "stader":
      if (suggestedFeeRecipient) return suggestedFeeRecipient;
      // Set fee recipient to socializing pool adddress if it is not defined
      else {
        if (network === "mainnet") return STADER_POOL_FEE_RECIPIENT_MAINNET;
        else if (network === "prater") return STADER_POOL_FEE_RECIPIENT_PRATER;
        else throw Error(`Fee recipient not found for tag: ${tag} and network: ${network}`);
      }
    default:
      throw Error("Fee recipient not found for tag: " + tag);
  }
}

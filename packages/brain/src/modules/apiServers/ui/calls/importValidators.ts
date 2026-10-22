import { withValidatorOperationLock } from "../../../db/withValidatorOperationLock.js";
import {
  isFeeRecipientEditable,
  isValidBlsPubkey,
  isValidEcdsaPubkey,
  tags,
  NonEditableFeeRecipientTag,
  Tag,
  shortenPubkey,
  prefix0xPubkey,
  Network,
  ROCKET_POOL_FEE_RECIPIENT,
  STADER_POOL_FEE_RECIPIENT_MAINNET,
  LIDO_FEE_RECIPIENT_MAINNET,
  LIDO_FEE_RECIPIENT_HOODI
} from "@stakingbrain/common";
import { CustomImportRequest } from "./types.js";
import { CronJob } from "../../../cron/cron.js";
import { BrainDataBase } from "../../../db/index.js";
import { Web3signerPostResponse } from "../../../apiClients/types.js";
import { StakingBrainDb } from "../../../db/types.js";
import logger from "../../../logger/index.js";
import { Web3SignerApi, ValidatorApi } from "../../../apiClients/index.js";

type ValidatorImportRequest = {
  requestIndex: number;
  keystore: string;
  password: string;
  tag: Tag;
  feeRecipient: string;
  pubkey: string;
};

/** Validate before importing; persist signer successes before configuring the validator client. */
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
  return withValidatorOperationLock(brainDb, async () => {
    reloadValidatorsCronTask.stop();
    try {
      if (
        !postRequest ||
        !Array.isArray(postRequest.validatorsImportRequest) ||
        postRequest.validatorsImportRequest.length === 0
      )
        throw new Error("Select at least one validator to import");
      if (!["ui", "api"].includes(postRequest.importFrom)) throw new Error("Invalid import origin");
      const existing = new Set(Object.keys(brainDb.getData()).map((pubkey) => pubkey.toLowerCase()));
      const validators: ValidatorImportRequest[] = [];
      const validatorsToPost: ValidatorImportRequest[] = [];
      const results: Web3signerPostResponse = { data: [] };
      const seen = new Set<string>();
      for (const [requestIndex, validator] of postRequest.validatorsImportRequest.entries()) {
        try {
          if (!validator || (typeof validator.keystore !== "string" && !Buffer.isBuffer(validator.keystore)))
            throw new Error("Keystore must contain JSON text");
          const keystore = validator.keystore.toString();
          let parsed: { pubkey?: string } | null;
          try {
            parsed = JSON.parse(keystore);
          } catch {
            throw new Error("Invalid keystore JSON");
          }
          if (typeof parsed?.pubkey !== "string" || !isValidBlsPubkey(prefix0xPubkey(parsed.pubkey)))
            throw new Error("Keystore must contain a valid BLS public key");
          const pubkey = prefix0xPubkey(parsed.pubkey).toLowerCase();
          if (seen.has(pubkey)) throw new Error(`Duplicate public key in import request: ${shortenPubkey(pubkey)}`);
          if (!tags.includes(validator.tag)) throw new Error("Invalid validator tag");
          if (typeof validator.password !== "string") throw new Error("Keystore password must be a string");
          const feeRecipient =
            !["gnosis", "lukso"].includes(network) && !isFeeRecipientEditable(validator.tag, postRequest.importFrom)
              ? getNonEditableFeeRecipient(validator.tag as NonEditableFeeRecipientTag, network, validator.feeRecipient)
              : validator.feeRecipient;
          if (typeof feeRecipient !== "string" || !isValidEcdsaPubkey(feeRecipient))
            throw new Error(`Invalid fee recipient for ${shortenPubkey(pubkey)}`);
          seen.add(pubkey);
          logger.info(`Setting ${feeRecipient} as fee recipient for ${pubkey}`);
          validators.push({
            requestIndex,
            keystore,
            password: validator.password,
            tag: validator.tag,
            feeRecipient: feeRecipient,
            pubkey
          });
        } catch (e) {
          results.data[requestIndex] = {
            status: "error",
            message: e.message
          };
        }
      }

      if (validators.length === 0) return results;
      const toDbRecords = (entries: ValidatorImportRequest[]): StakingBrainDb =>
        Object.fromEntries(
          entries.map(({ pubkey, tag, feeRecipient }) => [
            pubkey,
            {
              tag,
              feeRecipient,
              automaticImport: postRequest.importFrom !== "ui"
            }
          ])
        );
      // Check all database constraints, including size, before changing signer storage.
      brainDb.validateNewValidators(toDbRecords(validators));

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
      for (const [index, validator] of validators.entries()) {
        const { pubkey, requestIndex } = validator;
        const response = web3signerPostResponse.data[index] ?? {
          status: "error",
          message: "Signer did not return a result for this key"
        };
        results.data[requestIndex] = response;
        const postStatus = response.status;
        if (postStatus === "error") {
          response.message =
            (response.message ?? "") + ". Check that the keystore file format is valid and the password is correct.";
          logger.error(`Error importing keystore for pubkey ${shortenPubkey(pubkey)}: ${response.message}`);
        } else if (postStatus === "duplicate") {
          logger.warn(`Duplicate keystore for pubkey ${shortenPubkey(pubkey)}`);
          if (!existing.has(pubkey)) validatorsToPost.push(validator);
        } else if (postStatus === "imported") {
          if (!existing.has(pubkey)) validatorsToPost.push(validator);
        }
      }

      if (validatorsToPost.length === 0) return results;

      // Persist now so reload can repair a failed or interrupted client configuration.
      brainDb.addValidators({ validators: toDbRecords(validatorsToPost) });

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
        await validatorApi
          .setFeeRecipient(validator.feeRecipient, validator.pubkey)
          .catch((err) => logger.error(`Error setting validator feeRecipient for pubkey ${validator.pubkey} :`, err));
      }

      logger.debug(`Added fee recipients to validator API`);

      logger.debug(`Written on db: ${validatorsToPost.map((v) => v.pubkey).join(", ")}`);
      return results;
    } finally {
      reloadValidatorsCronTask.start();
    }
  });
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
      else if (network === "hoodi") return suggestedFeeRecipient || LIDO_FEE_RECIPIENT_HOODI;
      else throw Error(`Fee recipient not found for tag: ${tag} and network: ${network}`);

    // Stader FR cannot be known in advance
    case "stader":
      if (suggestedFeeRecipient) return suggestedFeeRecipient;
      // Set fee recipient to socializing pool adddress if it is not defined
      else {
        if (network === "mainnet") return STADER_POOL_FEE_RECIPIENT_MAINNET;
        else throw Error(`Fee recipient not found for tag: ${tag} and network: ${network}`);
      }
    default:
      throw Error("Fee recipient not found for tag: " + tag);
  }
}

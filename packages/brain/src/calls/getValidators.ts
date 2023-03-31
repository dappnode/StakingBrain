import {
  CustomValidatorGetResponse,
  WithdrawalCredentialsFormat,
  isValidWithdrawableBlsAddress,
  isValidNonWithdrawableBlsAddress,
} from "@stakingbrain/common";
import { brainDb, validatorApi, signerApi, beaconchainApi } from "../index.js";
import logger from "../modules/logger/index.js";

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
  for (const [pubkey, { tag, feeRecipient }] of Object.entries(data)) {
    let format: WithdrawalCredentialsFormat,
      withdrawalAddress = "";
    try {
      withdrawalAddress = (
        await beaconchainApi.getValidatorFromState({
          state: "head",
          pubkey,
        })
      ).data.validator.withdrawal_credentials;

      format = isValidWithdrawableBlsAddress(withdrawalAddress)
        ? "ecdsa"
        : isValidNonWithdrawableBlsAddress(withdrawalAddress)
        ? "bls"
        : "unknown";
    } catch (e) {
      logger.error(e);
      format = "unknown";
    }

    validators.push({
      pubkey,
      tag,
      feeRecipient,
      withdrawalCredentials: {
        address: withdrawalAddress,
        format,
      },
      validatorImported: validatorPubkeys.includes(pubkey),
      signerImported: signerPubkeys.includes(pubkey),
      validatorFeeRecipientCorrect: validatorsFeeRecipients.some(
        (feeRecipient) => feeRecipient === feeRecipient
      ),
    });
  }

  return validators;
}

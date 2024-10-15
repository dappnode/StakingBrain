import { isValidWithdrawableBlsAddress, isValidNonWithdrawableBlsAddress } from "@stakingbrain/common";
import { CustomValidatorGetResponse, WithdrawalCredentialsFormat } from "./types.js";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi, Web3SignerApi, BeaconchainApi } from "../../../apiClients/index.js";
import logger from "../../../logger/index.js";

/**
 * Get all validators from db
 * If running in development mode (NODE_ENV === "development") it will returns booleans for
 * validatorImported and validatorFeeRecipientCorrect checks from the validator API
 * @returns
 */
export async function getValidators({
  brainDb,
  validatorApi,
  signerApi,
  beaconchainApi
}: {
  brainDb: BrainDataBase;
  validatorApi: ValidatorApi;
  signerApi: Web3SignerApi;
  beaconchainApi: BeaconchainApi;
}): Promise<CustomValidatorGetResponse[]> {
  const data = brainDb.data;
  if (!data) return [];

  const validatorPubkeys = (
    await validatorApi.getRemoteKeys().catch((e) => {
      logger.error(e);
      return { data: [] };
    })
  ).data.map((validator) => validator.pubkey);

  const signerPubkeys = (
    await signerApi.listRemoteKeys().catch((e) => {
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
      withdrawalAddress = "",
      index = "";
    try {
      const validatorStateResponse = await beaconchainApi.getStateValidator({
        state: "head",
        pubkey
      });

      withdrawalAddress = validatorStateResponse.data.validator.withdrawal_credentials;
      index = validatorStateResponse.data.index;

      format = isValidWithdrawableBlsAddress(withdrawalAddress)
        ? "ecdsa"
        : isValidNonWithdrawableBlsAddress(withdrawalAddress)
          ? "bls"
          : "unknown";
    } catch (e) {
      logger.error(e);
      format = "error";
    }

    validators.push({
      pubkey,
      index,
      tag,
      feeRecipient,
      withdrawalCredentials: {
        address: withdrawalAddress,
        format
      },
      validatorImported: validatorPubkeys.includes(pubkey),
      signerImported: signerPubkeys.includes(pubkey),
      validatorFeeRecipientCorrect: validatorsFeeRecipients.some((feeRecipient) => feeRecipient === feeRecipient)
    });
  }

  return validators;
}

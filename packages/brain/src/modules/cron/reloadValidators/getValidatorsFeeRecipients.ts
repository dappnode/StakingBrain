import { ValidatorApi } from "../../apiClients/index.js";

/**
 * Get the validators fee recipients from the validator API for the given pubkeys
 */
export async function getValidatorsFeeRecipients({
  validatorApi,
  validatorPubkeys
}: {
  validatorApi: ValidatorApi;
  validatorPubkeys: string[];
}): Promise<{ pubkey: string; feeRecipient: string }[]> {
  const validatorData = [];

  for (const pubkey of validatorPubkeys) {
    validatorData.push({
      pubkey,
      feeRecipient: (await validatorApi.getFeeRecipient(pubkey)).data.ethaddress
    });
  }

  return validatorData;
}

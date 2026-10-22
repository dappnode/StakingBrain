import { isValidWithdrawableBlsAddress, isValidNonWithdrawableBlsAddress } from "@stakingbrain/common";
import { CustomValidatorGetResponse } from "./types.js";
import { BrainDataBase } from "../../../db/index.js";
import { ValidatorApi, Web3SignerApi, BeaconchainApi } from "../../../apiClients/index.js";
import logger from "../../../logger/index.js";

/** Read a stable snapshot with bounded concurrency and a deadline for the whole list. */
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
  const entries = Object.entries(brainDb.getData());
  if (entries.length === 0) return [];
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 10000);
  try {
    const [remoteKeys, signerKeys] = await Promise.all([
      validatorApi.getRemoteKeys(controller.signal).catch((error) => {
        logger.error(error);
        return { data: [] };
      }),
      signerApi.listRemoteKeys(controller.signal).catch((error) => {
        logger.error(error);
        return { data: [] };
      })
    ]);
    const validatorPubkeys = new Set(remoteKeys.data.map(({ pubkey }) => pubkey.toLowerCase()));
    const signerPubkeys = new Set(signerKeys.data.map(({ validating_pubkey }) => validating_pubkey.toLowerCase()));
    const results: CustomValidatorGetResponse[] = entries.map(([pubkey, details]) => ({
      pubkey,
      index: "",
      tag: details.tag,
      feeRecipient: details.feeRecipient,
      builderConfig: details.builderConfig,
      builderConfigStatus:
        validatorApi.getBuilderConfigStatus(pubkey) ??
        (details.builderConfig === undefined ? undefined : { status: "pending" }),
      withdrawalCredentials: { address: "", format: "error" },
      validatorImported: validatorPubkeys.has(pubkey.toLowerCase()),
      signerImported: signerPubkeys.has(pubkey.toLowerCase()),
      validatorFeeRecipientCorrect: false
    }));
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(8, results.length) }, async () => {
        while (next < results.length && !controller.signal.aborted) {
          const result = results[next++];
          await Promise.all([
            (async () => {
              if (!result.validatorImported) return;
              try {
                const response = await validatorApi.getFeeRecipient(result.pubkey, controller.signal);
                result.validatorFeeRecipientCorrect =
                  response.data.ethaddress.toLowerCase() === result.feeRecipient.toLowerCase();
              } catch (error) {
                logger.error(error);
              }
            })(),
            (async () => {
              try {
                const { data } = await beaconchainApi.getStateValidator({
                  state: "head",
                  pubkey: result.pubkey,
                  signal: controller.signal
                });
                const address = data.validator.withdrawal_credentials;
                result.index = data.index;
                result.withdrawalCredentials = {
                  address,
                  format: isValidWithdrawableBlsAddress(address)
                    ? "ecdsa"
                    : isValidNonWithdrawableBlsAddress(address)
                      ? "bls"
                      : "unknown"
                };
              } catch (error) {
                logger.error(error);
              }
            })()
          ]);
        }
      })
    );
    return results;
  } finally {
    clearTimeout(deadline);
  }
}

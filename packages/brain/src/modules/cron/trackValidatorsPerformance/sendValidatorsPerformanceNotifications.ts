import { DappmanagerApi } from "../../apiClients/index.js";
import { NotificationType } from "../../apiClients/dappmanager/types.js";
import { BlockProposalStatus, ValidatorPerformanceError } from "../../apiClients/postgres/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";
import { IdealRewards, TotalRewards } from "../../apiClients/types.js";

/**
 * Sends validator performance notification to the dappmanager. The notification will have the following format:
 * ```
 * **Validator(s) performance notification for epoch **
 * - Blocks:
 *  - Proposed: Validator(s) proposed a block
 *  - Missed: Validator(s) missed a block
 * - Attestations
 * - Error
 * ```
 */
export async function sendValidatorsPerformanceNotifications({
  sendNotification,
  dappmanagerApi,
  currentEpoch,
  validatorBlockStatusMap,
  validatorAttestationsRewards,
  error
}: {
  sendNotification: boolean;
  dappmanagerApi: DappmanagerApi;
  currentEpoch: string;
  validatorBlockStatusMap?: Map<string, BlockProposalStatus>;
  validatorAttestationsRewards?: { totalRewards: TotalRewards[]; idealRewards: IdealRewards };
  error?: ValidatorPerformanceError;
}): Promise<void> {
  if (!sendNotification) return;
  if (error)
    await dappmanagerApi.sendDappmanagerNotification({
      title: "Failed to fetch performance data",
      notificationType: NotificationType.Danger,
      body: `Failed to fetch performance data for epoch ${currentEpoch}: ${error}`
    });
  else if (validatorBlockStatusMap && validatorAttestationsRewards)
    await Promise.all([
      sendSuccessNotificationNotThrow({ dappmanagerApi, validatorBlockStatusMap, currentEpoch }),
      sendWarningNotificationNotThrow({
        dappmanagerApi,
        validatorBlockStatusMap,
        validatorAttestationsRewards,
        currentEpoch
      })
    ]);
}

/**
 * Triggers sending success notification in the dappmanager if any:
 * - blocks proposed
 */
async function sendSuccessNotificationNotThrow({
  dappmanagerApi,
  currentEpoch,
  validatorBlockStatusMap
}: {
  dappmanagerApi: DappmanagerApi;
  validatorBlockStatusMap: Map<string, BlockProposalStatus>;
  currentEpoch: string;
}): Promise<void> {
  const validatorsProposedBlocks = Array.from(validatorBlockStatusMap).filter(
    ([_, blockStatus]) => blockStatus === "Proposed"
  );

  if (validatorsProposedBlocks.length === 0) return;
  await dappmanagerApi
    .sendDappmanagerNotification({
      title: `Validator(s) proposed a block in epoch ${currentEpoch}`,
      notificationType: NotificationType.Success,
      body: `Validator(s) ${validatorsProposedBlocks.join(", ")} proposed a block`
    })
    .catch((error) => logger.error(`${logPrefix}Failed to send success notification to dappmanager`, error));
}

/**
 * Triggers sending warning notification in the dappmanager if any:
 * - blocks missed
 * - attestations missed
 */
async function sendWarningNotificationNotThrow({
  dappmanagerApi,
  validatorBlockStatusMap,
  validatorAttestationsRewards,
  currentEpoch
}: {
  dappmanagerApi: DappmanagerApi;
  validatorBlockStatusMap: Map<string, BlockProposalStatus>;
  validatorAttestationsRewards: { totalRewards: TotalRewards[]; idealRewards: IdealRewards };
  currentEpoch: string;
}): Promise<void> {
  // Send the warning notification together: block missed and att missed
  const validatorsMissedBlocks = Array.from(validatorBlockStatusMap).filter(
    ([_, blockStatus]) => blockStatus === "Missed"
  );
  const validatorsMissedAttestations = validatorAttestationsRewards.totalRewards
    .filter((validator) => parseInt(validator.source) <= 0)
    .map((validator) => validator.validator_index);

  if (validatorsMissedBlocks.length === 0 && validatorsMissedAttestations.length === 0) return;
  await dappmanagerApi
    .sendDappmanagerNotification({
      title: `Validator(s) missed a block or attestation in epoch ${currentEpoch}`,
      notificationType: NotificationType.Warning,
      body: `Validator(s) ${validatorsMissedBlocks.join(", ")} missed a block. Validator(s) ${validatorsMissedAttestations.join(
        ", "
      )} missed an attestation`
    })
    .catch((error) => logger.error(`${logPrefix}Failed to send warning notification to dappmanager`, error));
}

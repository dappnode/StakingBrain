import { DappmanagerApi } from "../../apiClients/index.js";
import { NotificationType } from "../../apiClients/dappmanager/types.js";
import { BlockProposalStatus, ValidatorsDataPerEpochMap } from "../../apiClients/postgres/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Sends validator performance notification to the dappmanager. The notifications available are:
 * - success: validator(s) proposed a block
 * - warning: validator(s) missed attestations
 * - danger: validator(s) missed a block
 */
export async function sendValidatorsPerformanceNotifications({
  dappmanagerApi,
  currentEpoch,
  validatorsDataPerEpochMap
}: {
  dappmanagerApi: DappmanagerApi;
  currentEpoch: string;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
}): Promise<void> {
  await Promise.all([
    sendSuccessNotificationNotThrow({ dappmanagerApi, validatorsDataPerEpochMap, currentEpoch }),
    sendWarningNotificationNotThrow({
      dappmanagerApi,
      validatorsDataPerEpochMap,
      currentEpoch
    }),
    sendDangerNotificationNotThrow({ dappmanagerApi, validatorsDataPerEpochMap, currentEpoch })
  ]);
}

async function sendSuccessNotificationNotThrow({
  dappmanagerApi,
  currentEpoch,
  validatorsDataPerEpochMap
}: {
  dappmanagerApi: DappmanagerApi;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
  currentEpoch: string;
}): Promise<void> {
  const validatorsProposedBlocks = Array.from(validatorsDataPerEpochMap).filter(
    ([_, data]) => data.block && data.block.status === BlockProposalStatus.Proposed
  );

  if (validatorsProposedBlocks.length === 0) return;
  await dappmanagerApi
    .sendDappmanagerNotification({
      title: `Block proposed in epoch ${currentEpoch}`,
      notificationType: NotificationType.Success,
      body: `Validator(s) ${validatorsProposedBlocks.join(", ")} proposed a block`
    })
    .catch((error) => logger.error(`${logPrefix}Failed to send success notification to dappmanager`, error));
}

async function sendWarningNotificationNotThrow({
  dappmanagerApi,
  validatorsDataPerEpochMap,
  currentEpoch
}: {
  dappmanagerApi: DappmanagerApi;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
  currentEpoch: string;
}): Promise<void> {
  const validatorsMissedAttestations = Array.from(validatorsDataPerEpochMap).filter(
    ([_, data]) => data.attestation && parseInt(data.attestation.totalRewards.source) <= 0
  );

  if (validatorsMissedAttestations.length === 0) return;
  await dappmanagerApi
    .sendDappmanagerNotification({
      title: `Missed attestation in epoch ${currentEpoch}`,
      notificationType: NotificationType.Warning,
      body: `Validator(s) ${validatorsMissedAttestations.join(", ")} missed attestations`
    })
    .catch((error) => logger.error(`${logPrefix}Failed to send warning notification to dappmanager`, error));
}

async function sendDangerNotificationNotThrow({
  dappmanagerApi,
  validatorsDataPerEpochMap,
  currentEpoch
}: {
  dappmanagerApi: DappmanagerApi;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
  currentEpoch: string;
}): Promise<void> {
  const validatorsMissedBlocks = Array.from(validatorsDataPerEpochMap).filter(
    ([_, data]) => data.block && data.block.status === BlockProposalStatus.Missed
  );

  if (validatorsMissedBlocks.length === 0) return;
  await dappmanagerApi
    .sendDappmanagerNotification({
      title: `Block missed in epoch ${currentEpoch}`,
      notificationType: NotificationType.Danger,
      body: `Validator(s) ${validatorsMissedBlocks.join(", ")} missed a block`
    })
    .catch((error) => logger.error(`${logPrefix}Failed to send danger notification to dappmanager`, error));
}

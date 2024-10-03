import { DappmanagerApi } from "../../apiClients/index.js";
import { NotificationType } from "../../apiClients/dappmanager/types.js";
import { BlockProposalStatus } from "../../apiClients/postgres/types.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";
import { IdealRewards, TotalRewards } from "../../apiClients/types.js";

/**
 * Sends validator performance notification to the dappmanager. The notifications available are:
 * - success: validator(s) proposed a block
 * - warning: validator(s) missed attestations
 * - danger: validator(s) missed a block
 */
export async function sendValidatorsPerformanceNotifications({
  dappmanagerApi,
  currentEpoch,
  validatorBlockStatusMap,
  validatorAttestationsRewards
}: {
  dappmanagerApi: DappmanagerApi;
  currentEpoch: string;
  validatorBlockStatusMap?: Map<string, BlockProposalStatus>;
  validatorAttestationsRewards?: { totalRewards: TotalRewards[]; idealRewards: IdealRewards };
}): Promise<void> {
  if (!validatorBlockStatusMap || !validatorAttestationsRewards) return;

  await Promise.all([
    sendSuccessNotificationNotThrow({ dappmanagerApi, validatorBlockStatusMap, currentEpoch }),
    sendWarningNotificationNotThrow({
      dappmanagerApi,
      validatorAttestationsRewards,
      currentEpoch
    }),
    sendDangerNotificationNotThrow({ dappmanagerApi, validatorBlockStatusMap, currentEpoch })
  ]);
}

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
      title: `Block proposed in epoch ${currentEpoch}`,
      notificationType: NotificationType.Success,
      body: `Validator(s) ${validatorsProposedBlocks.join(", ")} proposed a block`
    })
    .catch((error) => logger.error(`${logPrefix}Failed to send success notification to dappmanager`, error));
}

async function sendWarningNotificationNotThrow({
  dappmanagerApi,
  validatorAttestationsRewards,
  currentEpoch
}: {
  dappmanagerApi: DappmanagerApi;
  validatorAttestationsRewards: { totalRewards: TotalRewards[]; idealRewards: IdealRewards };
  currentEpoch: string;
}): Promise<void> {
  const validatorsMissedAttestations = validatorAttestationsRewards.totalRewards
    .filter((validator) => parseInt(validator.source) <= 0)
    .map((validator) => validator.validator_index);

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
  currentEpoch,
  validatorBlockStatusMap
}: {
  dappmanagerApi: DappmanagerApi;
  validatorBlockStatusMap: Map<string, BlockProposalStatus>;
  currentEpoch: string;
}): Promise<void> {
  const validatorsMissedBlocks = Array.from(validatorBlockStatusMap).filter(
    ([_, blockStatus]) => blockStatus === "Missed"
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

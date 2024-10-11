import { DappmanagerApi, PrometheusApi } from "../../apiClients/index.js";
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
  prometheusApi,
  currentEpoch,
  validatorsDataPerEpochMap
}: {
  dappmanagerApi: DappmanagerApi;
  prometheusApi: PrometheusApi;
  currentEpoch: string;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
}): Promise<void> {
  await Promise.all([
    sendSuccessNotificationNotThrow({ dappmanagerApi, validatorsDataPerEpochMap, currentEpoch }),
    sendWarningNotificationNotThrow({
      dappmanagerApi,
      prometheusApi,
      validatorsDataPerEpochMap,
      currentEpoch
    }),
    sendDangerNotificationNotThrow({ dappmanagerApi, prometheusApi, validatorsDataPerEpochMap, currentEpoch })
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
  prometheusApi,
  validatorsDataPerEpochMap,
  currentEpoch
}: {
  dappmanagerApi: DappmanagerApi;
  prometheusApi: PrometheusApi;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
  currentEpoch: string;
}): Promise<void> {
  const validatorsMissedAttestations = Array.from(validatorsDataPerEpochMap).filter(
    ([_, data]) => data.attestation && parseInt(data.attestation.totalRewards.source) <= 0
  );

  if (validatorsMissedAttestations.length === 0) return;
  const hostMetricsMessage = await getHostMetricsMessage(prometheusApi, currentEpoch);
  await dappmanagerApi
    .sendDappmanagerNotification({
      title: `Missed attestation in epoch ${currentEpoch}`,
      notificationType: NotificationType.Warning,
      body: `Validator(s) ${validatorsMissedAttestations.join(", ")} missed an attestation\n${hostMetricsMessage}`
    })
    .catch((error) => logger.error(`${logPrefix}Failed to send warning notification to dappmanager`, error));
}

async function sendDangerNotificationNotThrow({
  dappmanagerApi,
  prometheusApi,
  validatorsDataPerEpochMap,
  currentEpoch
}: {
  dappmanagerApi: DappmanagerApi;
  prometheusApi: PrometheusApi;
  validatorsDataPerEpochMap: ValidatorsDataPerEpochMap;
  currentEpoch: string;
}): Promise<void> {
  const validatorsMissedBlocks = Array.from(validatorsDataPerEpochMap).filter(
    ([_, data]) => data.block && data.block.status === BlockProposalStatus.Missed
  );

  if (validatorsMissedBlocks.length === 0) return;
  const hostMetricsMessage = await getHostMetricsMessage(prometheusApi, currentEpoch);
  await dappmanagerApi
    .sendDappmanagerNotification({
      title: `Block missed in epoch ${currentEpoch}`,
      notificationType: NotificationType.Danger,
      body: `Validator(s) ${validatorsMissedBlocks.join(", ")} missed a block\n${hostMetricsMessage}`
    })
    .catch((error) => logger.error(`${logPrefix}Failed to send danger notification to dappmanager`, error));
}

async function getHostMetricsMessage(prometheusApi: PrometheusApi, epoch: string): Promise<string> {
  const { startTimestamp, endTimestamp, avgCpuTemperature, avgCpuUsage, avgMemoryUsage, ioUtilizationPerDisk } =
    await prometheusApi.getPrometheusMetrics({ epoch: parseInt(epoch) });

  // Create a formatted message for Disk I/O utilization
  const ioUtilizationPerDiskMessage = Object.entries(ioUtilizationPerDisk)
    .map(([disk, utilization]) => `  - *${disk}*: *${utilization}%*`)
    .join("\n");

  // Create a structured and formatted message
  return `⚠️ *Average host metrics within epoch ${epoch}*:\n
- *CPU temperature*: *${avgCpuTemperature}°C*
- *CPU usage*: *${avgCpuUsage}%*
- *Memory usage*: *${avgMemoryUsage}%*
- *Disk I/O utilization*:\n${ioUtilizationPerDiskMessage}\n
${getDmsDashboardsMessage({ startTimestamp, endTimestamp })}`;
}

function getDmsDashboardsMessage({
  startTimestamp,
  endTimestamp
}: {
  startTimestamp: number;
  endTimestamp: number;
}): string {
  const startTimestampInMs = startTimestamp * 1000;
  const endTimestampInMs = endTimestamp * 1000;

  return `🔗 *For more details, check the DMS dashboards:*\n
- [Host dashboard](http://dms.dappnode/d/dms-host/host?orgId=1&from=${startTimestampInMs}&to=${endTimestampInMs})
- [Docker dashboard](http://dms.dappnode/d/dms-docker/docker?orgId=1&from=${startTimestampInMs}&to=${endTimestampInMs})`;
}

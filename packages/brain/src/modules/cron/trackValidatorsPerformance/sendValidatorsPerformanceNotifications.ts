import { DappmanagerApi, PrometheusApi } from "../../apiClients/index.js";
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
  prometheusApi,
  dappmanagerApi,
  currentEpoch,
  validatorBlockStatusMap,
  validatorAttestationsRewards
}: {
  prometheusApi: PrometheusApi;
  dappmanagerApi: DappmanagerApi;
  currentEpoch: string;
  validatorBlockStatusMap?: Map<string, BlockProposalStatus>;
  validatorAttestationsRewards?: { totalRewards: TotalRewards[]; idealRewards: IdealRewards };
}): Promise<void> {
  if (!validatorBlockStatusMap || !validatorAttestationsRewards) return;

  await Promise.all([
    sendSuccessNotificationNotThrow({ dappmanagerApi, validatorBlockStatusMap, currentEpoch }),
    sendWarningNotificationNotThrow({
      prometheusApi,
      dappmanagerApi,
      validatorAttestationsRewards,
      currentEpoch
    }),
    sendDangerNotificationNotThrow({ prometheusApi, dappmanagerApi, validatorBlockStatusMap, currentEpoch })
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
  prometheusApi,
  dappmanagerApi,
  validatorAttestationsRewards,
  currentEpoch
}: {
  prometheusApi: PrometheusApi;
  dappmanagerApi: DappmanagerApi;
  validatorAttestationsRewards: { totalRewards: TotalRewards[]; idealRewards: IdealRewards };
  currentEpoch: string;
}): Promise<void> {
  const validatorsMissedAttestations = validatorAttestationsRewards.totalRewards
    .filter((validator) => parseInt(validator.source) <= 0)
    .map((validator) => validator.validator_index);

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
  prometheusApi,
  dappmanagerApi,
  currentEpoch,
  validatorBlockStatusMap
}: {
  prometheusApi: PrometheusApi;
  dappmanagerApi: DappmanagerApi;
  validatorBlockStatusMap: Map<string, BlockProposalStatus>;
  currentEpoch: string;
}): Promise<void> {
  const validatorsMissedBlocks = Array.from(validatorBlockStatusMap).filter(
    ([_, blockStatus]) => blockStatus === "Missed"
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

  // create beautiful message for ioUtilizationPerDisk
  const ioUtilizationPerDiskMessage = Object.entries(ioUtilizationPerDisk)
    .map(([disk, utilization]) => {
      return `  - ${disk}: ${utilization}%`;
    })
    .join("\n");

  return `Average host metrics within epoch ${epoch}:\n
- CPU temperature: ${avgCpuTemperature}°C
- CPU usage: ${avgCpuUsage}%
- Memory usage: ${avgMemoryUsage}%
- Disk I/O utilization:\n${ioUtilizationPerDiskMessage}\n\n
${getDmsDashboardsMessage({ startTimestamp, endTimestamp })}`;
}

function getDmsDashboardsMessage({
  startTimestamp,
  endTimestamp
}: {
  startTimestamp: number;
  endTimestamp: number;
}): string {
  // dashboard links must be with timestamps in milliseconds
  // see https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/manage-dashboard-links/
  const startTimestampInMs = startTimestamp * 1000;
  const endTimestampInMs = endTimestamp * 1000;
  return `For more details, check the DMS dashboards:\n
- [Host dashboard](http://dms.dappnode/d/dms-host/host?orgId=1&from=${startTimestampInMs}&to=${endTimestampInMs})
- [Docker dashboard](http://dms.dappnode/d/dms-docker/docker?orgId=1&from=${startTimestampInMs}&to=${endTimestampInMs})`;
}

import { Network } from "@stakingbrain/common";
import { BeaconchainApi, DappmanagerApi, NotificationsApi } from "../../apiClients/index.js";
import { getWeb3signerDnpName } from "./params.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";
import { BrainDataBase } from "../../db/index.js";
import { sendValidatorsOfflineNotification } from "./sendValidatorsOfflineNotification.js";

export async function sendValidatorsNotifications({
  network,
  brainDb,
  beaconchainApi,
  dappmanagerApi,
  notificationsApi
}: {
  network: Network;
  brainDb: BrainDataBase;
  beaconchainApi: BeaconchainApi;
  dappmanagerApi: DappmanagerApi;
  notificationsApi: NotificationsApi;
}): Promise<void> {
  // Get web3signer notifications settings from dappmanager API
  const web3signerDnpName = getWeb3signerDnpName(network);
  const manifest = await dappmanagerApi.getPackageManifest({ dnpName: web3signerDnpName });

  const customEndpoints = manifest.notifications?.customEndpoints;

  if (!customEndpoints?.length) {
    logger.warn(`${logPrefix}No notification settings found for ${web3signerDnpName}. Notifications will not be sent.`);
    return;
  }

  // Send notifications if any

  // validator offline
  const validatorOfflineNotificationEnabled = customEndpoints.some(
    (endpoint) => endpoint.name === "Validator offline" && endpoint.enabled
  );
  if (validatorOfflineNotificationEnabled)
    await sendValidatorsOfflineNotification(brainDb, beaconchainApi, notificationsApi);

  // validator liveness
}

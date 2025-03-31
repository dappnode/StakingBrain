import { BrainDataBase } from "../../db/index.js";
import { BeaconchainApi, NotificationsApi } from "../../apiClients/index.js";

export async function sendValidatorsOfflineNotification(
  brainDb: BrainDataBase,
  beaconchainApi: BeaconchainApi,
  notificationsApi: NotificationsApi
): Promise<void> {}

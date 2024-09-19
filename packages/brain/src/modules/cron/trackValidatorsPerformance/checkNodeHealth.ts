import { BeaconchainApi } from "../../apiClients/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Check the health of the node, if the EL node is offline or the node is syncing, an error will be thrown.
 *
 * @param {BeaconchainApi} beaconchainApi - Beaconchain API client.
 * @throws {Error} - If the EL node is offline or the node is syncing.
 */
export async function checkNodeHealth({ beaconchainApi }: { beaconchainApi: BeaconchainApi }): Promise<void> {
  const { el_offline, is_syncing } = (await beaconchainApi.getSyncingStatus()).data;
  logger.debug(`${logPrefix}EL Node offline: ${el_offline}, Node syncing: ${is_syncing}`);
  if (el_offline) throw Error("EL Node is offline");
  if (is_syncing) throw Error("Node is syncing");
}

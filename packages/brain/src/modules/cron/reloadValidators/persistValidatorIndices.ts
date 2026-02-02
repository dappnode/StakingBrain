import { BeaconchainApi } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import { ValidatorStatus } from "../../apiClients/beaconchain/types.js";
import { shortenPubkey } from "@stakingbrain/common";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Fetches validator indices and statuses from the Beacon API for all validators in the database
 * and persists them.
 *
 * This function:
 * - Fetches all validator pubkeys from the database
 * - Makes a single batch API call to retrieve data for all validators
 * - Updates the database with the retrieved indices and statuses
 * - Handles failures gracefully without throwing errors
 *
 * @param beaconchainApi - The Beacon API client
 * @param brainDb - The database instance
 */
export async function persistValidatorIndices({
  beaconchainApi,
  brainDb
}: {
  beaconchainApi: BeaconchainApi;
  brainDb: BrainDataBase;
}): Promise<void> {
  try {
    const dbData = brainDb.getData();
    const allPubkeys = Object.keys(dbData);

    if (allPubkeys.length === 0) {
      logger.debug(`${logPrefix}No validators in database to fetch data for`);
      return;
    }

    logger.debug(`${logPrefix}Fetching indices and statuses for ${allPubkeys.length} validators using batch API`);

    // Fetch all validator data in a single batch API call
    const response = await beaconchainApi.postStateValidators({
      stateId: "head",
      body: {
        ids: allPubkeys,
        statuses: [] // Empty array means all statuses
      }
    });

    // Collect successfully fetched data and track changes
    const validatorsToUpdate: {
      [pubkey: string]: {
        index: number;
        status: ValidatorStatus;
        feeRecipient: string;
      }
    } = {};

    let newIndicesCount = 0;
    let statusChangesCount = 0;

    for (const validatorData of response.data) {
      const pubkey = validatorData.validator.pubkey;
      if (dbData[pubkey]) {
        const newIndex = parseInt(validatorData.index);
        const newStatus = validatorData.status;
        const existingIndex = dbData[pubkey].index;
        const existingStatus = dbData[pubkey].status;

        // Only update if index or status has changed
        const indexChanged = existingIndex !== newIndex;
        const statusChanged = existingStatus !== newStatus;

        if (indexChanged || statusChanged) {
          validatorsToUpdate[pubkey] = {
            index: newIndex,
            status: newStatus,
            feeRecipient: dbData[pubkey].feeRecipient
          };

          // Log when index is set for the first time
          if (existingIndex === undefined && newIndex !== undefined) {
            newIndicesCount++;
            logger.info(
              `${logPrefix}Validator ${shortenPubkey(pubkey)} assigned index ${newIndex} with status ${newStatus}`
            );
          }

          // Log when status changes
          if (existingStatus !== undefined && statusChanged) {
            statusChangesCount++;
            logger.info(
              `${logPrefix}Validator ${shortenPubkey(pubkey)} (index ${newIndex}) status changed: ${existingStatus} → ${newStatus}`
            );
          }
        }
      }
    }

    const updateCount = Object.keys(validatorsToUpdate).length;

    if (updateCount > 0) {
      brainDb.updateValidators({ validators: validatorsToUpdate });
      logger.debug(
        `${logPrefix}Persisted ${updateCount} validator updates (${newIndicesCount} new indices, ${statusChangesCount} status changes)`
      );
    }

  } catch (e) {
    logger.error(`${logPrefix}Error persisting validator indices and statuses`, e);
  }
}

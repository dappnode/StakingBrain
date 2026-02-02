import { BeaconchainApi } from "../../apiClients/index.js";
import { BrainDataBase } from "../../db/index.js";
import { ValidatorStatus } from "../../apiClients/beaconchain/types.js";
import { shortenPubkey } from "@stakingbrain/common";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";
import { StakingBrainDb } from "../../db/types.js";

interface ValidatorUpdate {
  index: number;
  status: ValidatorStatus;
  feeRecipient: string;
}

interface UpdateResult {
  validatorsToUpdate: Record<string, ValidatorUpdate>;
  newIndicesCount: number;
  statusChangesCount: number;
}

/**
 * Fetches validator indices and statuses from the Beacon API for all validators
 * in the database and persists any changes.
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

    logger.debug(`${logPrefix}Fetching indices and statuses for ${allPubkeys.length} validators`);

    const response = await beaconchainApi.postStateValidators({
      stateId: "head",
      body: { ids: allPubkeys, statuses: [] }
    });

    const { validatorsToUpdate, newIndicesCount, statusChangesCount } = processValidatorResponse(
      response.data,
      dbData
    );

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

/**
 * Processes the beacon API response and identifies validators that need updating.
 */
function processValidatorResponse(
  responseData: { index: string; status: ValidatorStatus; validator: { pubkey: string } }[],
  dbData: StakingBrainDb
): UpdateResult {
  const validatorsToUpdate: Record<string, ValidatorUpdate> = {};
  let newIndicesCount = 0;
  let statusChangesCount = 0;

  for (const validatorData of responseData) {
    const pubkey = validatorData.validator.pubkey;
    const dbEntry = dbData[pubkey];

    if (!dbEntry) continue;

    const newIndex = parseInt(validatorData.index);
    const newStatus = validatorData.status;
    const indexChanged = dbEntry.index !== newIndex;
    const statusChanged = dbEntry.status !== newStatus;

    if (!indexChanged && !statusChanged) continue;

    validatorsToUpdate[pubkey] = {
      index: newIndex,
      status: newStatus,
      feeRecipient: dbEntry.feeRecipient
    };

    if (dbEntry.index === undefined) {
      newIndicesCount++;
      logger.info(
        `${logPrefix}Validator ${shortenPubkey(pubkey)} assigned index ${newIndex} with status ${newStatus}`
      );
    }

    if (dbEntry.status !== undefined && statusChanged) {
      statusChangesCount++;
      logger.info(
        `${logPrefix}Validator ${shortenPubkey(pubkey)} (index ${newIndex}) status changed: ${dbEntry.status} → ${newStatus}`
      );
    }
  }

  return { validatorsToUpdate, newIndicesCount, statusChangesCount };
}

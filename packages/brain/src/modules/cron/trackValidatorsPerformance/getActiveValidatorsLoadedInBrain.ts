import { isEmpty } from "lodash-es";
import { BeaconchainApi } from "../../apiClients/index.js";
import { ValidatorStatus } from "../../apiClients/types.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Get the active validators from the beaconchain API. To do so, it will get the validator indexes from the brain db.
 * If there are no indexes, it will get them from the beaconchain API and update the brain db with the indexes for further use.
 *
 * @param {BeaconchainApi} beaconchainApi - Beaconchain API client.
 * @param {BrainDataBase} brainDb - Brain DB client.
 * @returns {string[]} - Array of active validator indexes.
 */
export async function getActiveValidatorsLoadedInBrain({
  beaconchainApi,
  brainDb
}: {
  beaconchainApi: BeaconchainApi;
  brainDb: BrainDataBase;
}): Promise<string[]> {
  const validatorIndexes = await getValidatorIndexesAndSaveInDb({ beaconchainApi, brainDb });
  if (validatorIndexes.length === 0) return [];
  const response = await beaconchainApi.postStateValidators({
    body: {
      ids: validatorIndexes,
      statuses: [ValidatorStatus.ACTIVE_ONGOING]
    },
    stateId: "finalized"
  });

  return response.data.map((validator) => validator.index.toString());
}

/**
 * Get the validator indexes from the brain db, if they are not present, get them from the beaconchain API
 * and update the brain db with the indexes.
 *
 * @param {BeaconchainApi} beaconchainApi - Beaconchain API client.
 * @param {BrainDataBase} brainDb - Brain DB client.
 * @returns {string[]} - Array of validator indexes.
 */
async function getValidatorIndexesAndSaveInDb({
  beaconchainApi,
  brainDb
}: {
  beaconchainApi: BeaconchainApi;
  brainDb: BrainDataBase;
}): Promise<string[]> {
  const brainDbData = brainDb.getData();
  if (isEmpty(brainDbData)) return [];

  // Get validator indexes from brain db
  const validatorIndexes: string[] = [];
  const validatorPubkeysWithNoIndex: string[] = [];
  // Iterate over brain db data and push the indexes to the array
  for (const [pubkey, details] of Object.entries(brainDbData)) {
    if (details.index) validatorIndexes.push(details.index.toString());
    else validatorPubkeysWithNoIndex.push(pubkey);
  }

  // If there are validators with no index, fetch them in batch from the beaconchain API
  if (validatorPubkeysWithNoIndex.length > 0) {
    logger.debug(`${logPrefix}Getting validator indexes from pubkeys`);

    const response = await beaconchainApi.postStateValidators({
      stateId: "finalized",
      body: {
        ids: validatorPubkeysWithNoIndex,
        statuses: []
      }
    });

    // Update the brain DB with fetched indexes and add them to the array
    for (const validatorData of response.data) {
      const { pubkey } = validatorData.validator;
      const index = validatorData.index;
      validatorIndexes.push(index);
      brainDb.updateValidators({ validators: { [pubkey]: { ...brainDbData[pubkey], index: parseInt(index) } } } );
    }
  }

  return validatorIndexes;
}

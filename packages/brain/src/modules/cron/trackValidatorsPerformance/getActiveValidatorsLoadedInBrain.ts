import { isEmpty } from "lodash-es";
import { BeaconchainApi } from "../../apiClients/index.js";
import { ValidatorStatus } from "../../apiClients/types.js";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";
import { logPrefix } from "./logPrefix.js";

/**
 * Get the active validators from the beaconchain API. To do so it will get the validator indexes from the brain db,
 * if there are no indexes, it will get them from the beaconchain API and update the brain db with the indexes for further
 * use.
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
  return (
    await beaconchainApi.postStateValidators({
      body: {
        ids: validatorIndexes,
        statuses: validatorIndexes.map(() => ValidatorStatus.ACTIVE_ONGOING)
      },
      stateId: "finalized"
    })
  ).data.map((validator) => validator.index);
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

  // get validator indexes from brain db
  const validatorIndexes: string[] = [];
  const validatorPubkeysWithNoIndex: string[] = [];
  // iterate over brain db data and push the indexes to the array
  for (const [pubkey, details] of Object.entries(brainDbData)) {
    if (details.index) validatorIndexes.push(details.index.toString());
    else validatorPubkeysWithNoIndex.push(pubkey);
  }

  if (validatorPubkeysWithNoIndex.length > 0) {
    logger.debug(`${logPrefix}Getting validator indexes from pubkeys`);
    await Promise.all(
      validatorPubkeysWithNoIndex.map(async (pubkey) => {
        const index = (await beaconchainApi.getStateValidator({ state: "finalized", pubkey })).data.index;
        validatorIndexes.push(index);
        brainDb.updateValidators({ validators: { [pubkey]: { ...brainDbData[pubkey], index: parseInt(index) } } });
      })
    );
  }

  return validatorIndexes;
}

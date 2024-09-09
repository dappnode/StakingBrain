import { ValidatorApi } from "../apiClients/validator.js";
import { Beaconchain } from "../apiClients/beaconchain.js";

/**
 *
 * @param validatorIndexes
 * @param validatorApi
 * @param beaconchain
 */
export async function writeValidatorsPerformance(
  validatorIndexes: string[],
  validatorApi: ValidatorApi,
  beaconchainApi: Beaconchain
): Promise<void> {
  //
  // 1. Get the epoch head finalized
  // It cannot be retrieved epoch with epoch distance > 1from the current epoch. Otherwise 400: BAD_REQUEST
  const headEpochFinalizedMinusOne = (await beaconchainApi.getEpochHeader("finalized")) - 1;

  // 2. Get validator duties for given epoch from head finalized
  //const validatorDuties = await validatorApi.getAttesterDuties(validatorIndexes, headEpochFinalized.toString());

  // 3. Check the validator submitted an attestation:
  //    - Get block attestations for the epoch slot and committee index
  await beaconchainApi.getLiveness(headEpochFinalizedMinusOne.toString(), validatorIndexes);
  //    - Check the aggregation_bits for the validator_committee_index

  // 4. Write on db
}

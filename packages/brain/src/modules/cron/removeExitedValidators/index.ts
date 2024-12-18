import { BeaconchainApi, ValidatorApi, Web3SignerApi } from "../../apiClients/index.js";
import { ValidatorStatus } from "../../apiClients/types";
import { BrainDataBase } from "../../db/index.js";
import logger from "../../logger/index.js";

/**
 * Remove the validators with status "exited_slashed" or "withdrawal_done"
 */
export async function removeExitedValidators(
  brainDb: BrainDataBase,
  signerApi: Web3SignerApi,
  validatorApi: ValidatorApi,
  beaconchainApi: BeaconchainApi
): Promise<void> {
  try {
    // get validators from db
    const validators = brainDb.getData();

    // get validators status from beaconchain
    const validatorsStatus = await beaconchainApi.postStateValidators({
      stateId: "finalized",
      body: {
        ids: Object.keys(validators),
        statuses: [ValidatorStatus.EXITED_SLASHED, ValidatorStatus.WITHDRAWAL_DONE]
      }
    });

    // filter validators with status "exited_slashed" or "withdrawal_done"
    const validatorsToRemove = validatorsStatus.data
      .filter(
        (validator) =>
          validator.status === ValidatorStatus.EXITED_SLASHED || validator.status === ValidatorStatus.WITHDRAWAL_DONE
      )
      .map((validator) => validator.index);

    if (validatorsToRemove.length === 0) {
      logger.info("No validators with status 'exited_slashed' or 'withdrawal_done' to remove");
      return;
    }

    logger.info(
      `Removing validators with status "exited_slashed" or "withdrawal_done": ${validatorsToRemove.join(", ")}`
    );

    // remove validators from the validator API
    await validatorApi.deleteRemoteKeys({ pubkeys: validatorsToRemove });
    // remove validators from the signer API
    await signerApi.deleteRemoteKeys({ pubkeys: validatorsToRemove });
    // remove validators from the DB
    brainDb.deleteValidators(validatorsToRemove);
  } catch (e) {
    logger.error(`Error removing exited validators: ${e.message}`, e);
  }
}

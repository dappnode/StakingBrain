import {
  BeaconchainPoolVoluntaryExitsPostRequest,
  ValidatorExitExecute,
  ValidatorExitGet,
} from "@stakingbrain/common";
import { beaconchainApi, signerApi } from "../index.js";
import logger from "../modules/logger/index.js";

/**
 * Get exit validators info signed
 * @param pubkeys The public keys of the validators to exit
 * @returns The exit data signed of each validator
 */
export async function getExitValidators({
  pubkeys,
}: {
  pubkeys: string[];
}): Promise<BeaconchainPoolVoluntaryExitsPostRequest[]> {
  const validatorsExit = await _getExitValidators(pubkeys);
  logger.debug(validatorsExit);
  return validatorsExit;
}

/**
 * Performs a voluntary exit for a given set of validators as identified via `pubkeys`
 * @param pubkeys The public keys of the validators to exit
 * @returns The exit status of each validator
 */
export async function exitValidators({
  pubkeys,
}: {
  pubkeys: string[];
}): Promise<ValidatorExitExecute[]> {
  const validatorsToExit = await _getExitValidators(pubkeys);
  const exitValidatorsResponses: ValidatorExitExecute[] = [];
  for (const validatorToExit of validatorsToExit) {
    try {
      await beaconchainApi.postVoluntaryExits({
        postVoluntaryExitsRequest: {
          message: {
            epoch: validatorToExit.message.epoch,
            validator_index: validatorToExit.message.validator_index,
          },
          signature: validatorToExit.signature,
        },
      });
      exitValidatorsResponses.push({
        pubkey: validatorToExit.pubkey,
        status: {
          exited: true,
          message: "Successfully exited validator",
        },
      });
    } catch (e) {
      exitValidatorsResponses.push({
        pubkey: validatorToExit.pubkey,
        status: {
          exited: false,
          message: `Error exiting validator ${e.message}`,
        },
      });
    }
  }

  return exitValidatorsResponses;
}

/**
 * Get exit validators info
 * @param pubkeys The public keys of the validators to exit
 * @returns The exit validators info signed
 */
async function _getExitValidators(
  pubkeys: string[]
): Promise<ValidatorExitGet[]> {
  // Get the current epoch from the beaconchain API to exit the validators
  const currentEpoch = await beaconchainApi.getCurrentEpoch();

  // Get the fork from the beaconchain API to sign the voluntary exit
  const fork = await beaconchainApi.getForkFromState({ state_id: "head" });

  // Get the genesis from the beaconchain API to sign the voluntary exit
  const genesis = await beaconchainApi.getGenesis();

  // Get the validators indexes from the validator API
  const validatorPubkeysIndexes = (
    await Promise.all(
      pubkeys.map((pubkey) =>
        beaconchainApi.getValidatorFromState({ state: "head", pubkey })
      )
    )
  ).map((validator) => {
    return {
      pubkey: validator.data.validator.pubkey,
      index: validator.data.index,
    };
  });

  const validatorsExit: ValidatorExitGet[] = [];
  for (const validatorIndex of validatorPubkeysIndexes) {
    const validatorSignature = await signerApi.signVoluntaryExit({
      signerVoluntaryExitRequest: {
        type: "VOLUNTARY_EXIT",
        fork_info: {
          fork: {
            previous_version: fork.data.previous_version,
            current_version: fork.data.current_version,
            epoch: fork.data.epoch,
          },
          genesis_validators_root: genesis.data.genesis_validators_root,
        },
        voluntary_exit: {
          epoch: currentEpoch.toString(),
          validator_index: validatorIndex.index,
        },
      },
      pubkey: validatorIndex.pubkey,
    });
    validatorsExit.push({
      pubkey: validatorIndex.pubkey,
      message: {
        epoch: currentEpoch.toString(),
        validator_index: validatorIndex.index,
      },
      signature: validatorSignature,
    });
  }

  return validatorsExit;
}

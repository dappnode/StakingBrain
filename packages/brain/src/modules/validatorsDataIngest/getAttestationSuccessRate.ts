import type { ValidatorPerformance } from "../apiClients/postgres/types.js";
import logger from "../logger/index.js";

/**
 * Calculates the attestation success rate for a given validator. The attestation success rate is the percentage of successful attestations
 * Being the total attestation opportunities the number of epochs between the first and last epoch in the data set of a specific validator.
 * And the total successful attestations the number of epochs where the validator successfully attested: source must be >= 0.
 *
 * The epoch must be greater or equal to the startEpoch and less than the endEpoch.
 *
 * @param validatorData the data of the validator from the postgres database
 * @param startEpoch the start epoch of the data set
 * @param endEpoch the end epoch of the data set
 */
export function getAttestationSuccessRate({
  validatorData,
  startEpoch,
  endEpoch
}: {
  validatorData: ValidatorPerformance[];
  startEpoch: number;
  endEpoch: number;
}): number {
  // Calculate the total attestation opportunities
  const totalAttestationOpportunities = endEpoch - startEpoch;
  if (totalAttestationOpportunities <= 0) {
    logger.warn("totalAttestationOpportunities is less than or equal to 0");
    return 0;
  }

  // Calculate the total successful attestations
  const totalSuccessfulAttestations = validatorData.filter((data) => {
    const attestationsTotalRewards = data.attestationsTotalRewards;
    if (!attestationsTotalRewards) return false;
    return data.epoch >= startEpoch && data.epoch < endEpoch && parseInt(attestationsTotalRewards.source) >= 0;
  }).length;

  return Math.round((totalSuccessfulAttestations / totalAttestationOpportunities) * 100);
}

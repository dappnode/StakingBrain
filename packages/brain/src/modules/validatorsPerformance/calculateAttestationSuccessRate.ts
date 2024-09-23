import type { ValidatorPerformance } from "../apiClients/postgres/types.js";

/**
 * Calculates the attestation success rate for a given validator. The attestation success rate is the percentage of successful attestations
 * Being the total attestation opportunities the number of epochs between the first and last epoch in the data set of a specific validator.
 * And the total successful attestations the number of epochs where the validator successfully attested: source must be >= 0.
 *
 * @param validatorData the data of the validator from the postgres database
 * @param startEpoch the start epoch of the data set
 * @param endEpoch the end epoch of the data set
 */
export function calculateAttestationSuccessRate({
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

  // Calculate the total successful attestations
  const totalSuccessfulAttestations = validatorData.filter(
    (data) => parseInt(data.attestationsTotalRewards.source) >= 0
  ).length;

  return (totalSuccessfulAttestations / totalAttestationOpportunities) * 100;
}

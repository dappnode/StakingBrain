import type { ValidatorPerformance } from "../apiClients/postgres/types.js";

/**
 * Calculates the blocks proposed success rate for a given validator. The blocks proposed success rate is the percentage of successful block proposals
 * Being the total block proposal opportunities the number of epochs where the validator proposed a block or missed a block.
 * And the total successful block proposals the number of epochs where the validator successfully proposed a block.
 *
 * @param validatorData the data of the validator from the postgres database
 * @returns the blocks proposed success rate
 */
export function calculateBlocksProposedSuccessRate({
  validatorData
}: {
  validatorData: ValidatorPerformance[];
}): number {
  // Calculate the total block proposal opportunities
  const totalBlockProposalOpportunities = validatorData.filter(
    (data) => data.blockProposalStatus === "Proposed" || data.blockProposalStatus === "Missed"
  ).length;

  // Calculate the total successful block proposals
  const totalSuccessfulBlockProposals = validatorData.filter((data) => data.blockProposalStatus === "Proposed").length;

  return (totalSuccessfulBlockProposals / totalBlockProposalOpportunities) * 100;
}

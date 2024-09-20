import { PostgresClient } from "../apiClients/index.js";

// Module in charge of queriyng the validators attestation rewards, block proposals and sync committee rewards and
// processing the data to be displayed in the validators performance page.

// FRONTEND

// Will display the following data:
// - Attestation success rate (not chart until granularity)
// - Blocks proposed success rate (not chart until granularity)
// - Sync committee success rate (not chart until granularity)
// - Balance -> No chart
// - Means: mean attestation success rate, mean blocks proposed success rate, mean balance -> No chart

// BACKEND

// The frontend will call backend with arguments:
// - startDate and endDate -> backend will translate these dates to epochs.
//      The backend will calculate  ValidatorsPerformanceProcessed for the given dates
//      If no arguments passeed to backend then the backend will use last 7 days epoch and latest epoch
// - Clients (execution and consensus) -> optional
// - Attestation/block success rate granularity (future): admit granularity of att success rate: by epoch, by day, by week, by month -> THIS enables chart visualization

// Return also current balance for each validator

// Note: It is overkill to store in db the attestation success rate for each epoch since it is only useful froma a global perspective
// taking into account the historical data. As for now we will calculate dynamicall the attestation success rate with the arguments: epoch start and epoch end.

//  (%) = (Number of Successful Attestations + Number of Successful Proposals) / (Total Attestation Opportunities + Total Proposal Opportunities) * 100
// Total Attestation Opportunities: is the number of epochs between the first and last epoch in the data set of a specific validator.
// Total Proposal Opportunities:

// TODO: blocksProposedByEpochAndSlot

interface ValidatorsPerformanceProcessed {
  mapValidatorPerformance: Map<
    string,
    {
      attestationSuccessRate: number;
      blocksProposedSuccessRate: number;
      balance: number;
      syncCommitteeSuccessRate?: number;
    }
  >;
  meanAttestationSuccessRate: number;
  meanBlocksProposedSuccessRate: number;
  meanBalance: number;
}

/**
 *
 */
export async function processValidatorsData({
  validatorIndexes,
  postgresClient
}: {
  validatorIndexes: string[];
  postgresClient: PostgresClient;
}) {}

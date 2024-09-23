export interface ValidatorsPerformanceProcessed {
  mapValidatorPerformance: Map<
    string,
    {
      attestationSuccessRate: number;
      blocksProposedSuccessRate: number;
      //balance: number;
      syncCommitteeSuccessRate?: number;
    }
  >;
  meanAttestationSuccessRate: number;
  meanBlocksProposedSuccessRate: number;
  //meanBalance: number;
}

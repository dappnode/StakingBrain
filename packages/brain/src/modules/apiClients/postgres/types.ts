export enum BlockProposalStatus {
  Missed = "Missed",
  Proposed = "Proposed",
  Unchosen = "Unchosen",
  Error = "Error"
}

export interface ValidatorPerformance {
  validatorIndex: number;
  epoch: number;
  slot?: number;
  liveness?: boolean;
  blockProposalStatus?: BlockProposalStatus;
  syncCommitteeRewards?: number;
  attestationsRewards?: object;
  error?: string;
}

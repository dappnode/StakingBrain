export enum BlockProposalStatus {
  Missed = "missed",
  Proposed = "proposed",
  Unchosen = "unchosen"
}

export interface ValidatorPerformance {
  validatorIndex: number;
  epoch: number;
  slot: number;
  liveness?: boolean;
  blockProposalStatus?: BlockProposalStatus;
  syncCommitteeRewards?: number;
  attestationsRewards?: object;
  error?: string;
}

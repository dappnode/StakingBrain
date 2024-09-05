export interface BeaconchainBlockHeaderGetResponse {
  execution_optimistic: boolean;
  data: {
    root: string;
    canonical: boolean;
    header: {
      message: {
        slot: string;
        proposer_index: string;
        parent_root: string;
        state_root: string;
        body_root: string;
      };
      signature: string;
    };
  };
}

export interface BeaconchainValidatorFromStateGetResponse {
  execution_optimistic: boolean;
  data: {
    index: string;
    balance: string;
    status: string;
    validator: {
      pubkey: string;
      withdrawal_credentials: string;
      effective_balance: string;
      slashed: boolean;
      activation_eligibility_epoch: string;
      activation_epoch: string;
      exit_epoch: string;
      withdrawable_epoch: string;
    };
  };
}

export interface BeaconchainPoolVoluntaryExitsPostRequest {
  message: {
    epoch: string;
    validator_index: string;
  };
  signature: string;
}

export interface BeaconchainForkFromStateGetResponse {
  execution_optimistic: boolean;
  data: {
    previous_version: string;
    current_version: string;
    epoch: string;
  };
}

export interface BeaconchainStateFinalityCheckpointsPostResponse {
  execution_optimistic: boolean;
  finalized: boolean;
  data: {
    previous_justified: {
      epoch: string;
      root: string;
    };
    current_justified: {
      epoch: string;
      root: "string";
    };
    finalized: {
      epoch: string;
      root: "string";
    };
  };
}

export interface BeaconchainGenesisGetResponse {
  data: {
    genesis_time: string;
    genesis_validators_root: string;
    genesis_fork_version: string;
  };
}

// See validator status spec https://hackmd.io/ofFJ5gOmQpu1jjHilHbdQQ
export enum ValidatorStatus {
  PENDING_INITIALIZED = "pending_initialized",
  PENDING_QUEUED = "pending_queued",
  ACTIVE_ONGOING = "active_ongoing",
  ACTIVE_EXITING = "active_exiting",
  ACTIVE_SLASHED = "active_slashed",
  EXITED_SLASHED = "exited_slashed",
  EXITED_UNSLASHED = "exited_unslashed",
  WITHDRAWAL_POSIBLE = "withdrawal_possible",
  WITHDRAWAL_DONE = "withdrawal_done"
}

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

export interface BeaconchainSyncingStatusGetResponse {
  data: {
    head_slot: string;
    sync_distance: string;
    is_syncing: boolean;
    is_optimistic: boolean;
    el_offline: boolean;
  };
}

export interface TotalRewards {
  validator_index: string;
  head: string;
  target: string;
  source: string;
  inclusion_delay: string;
  inactivity: string;
}

export interface IdealRewards {
  effective_balance: string;
  head: string;
  target: string;
  source: string;
  inclusion_delay: string;
  inactivity: string;
}

export interface BeaconchainAttestationRewardsPostResponse {
  execution_optimistic: boolean;
  finalized: boolean;
  data: {
    ideal_rewards: IdealRewards[];
    total_rewards: TotalRewards[];
  };
}

export interface BeaconchainProposerDutiesGetResponse {
  dependent_root: string; // The block root that the response is dependent on.
  execution_optimistic: boolean; // Indicates whether the response references an unverified execution payload.
  data: {
    pubkey: string; // The validator's BLS public key, 48-bytes, hex encoded with 0x prefix.
    validator_index: string; // The index of the validator in the validator registry.
    slot: string; // The slot at which the validator must propose a block.
  }[];
}

export interface BeaconchainSyncCommitteePostResponse {
  execution_optimistic: boolean;
  finalized: boolean;
  data: {
    validator_index: string;
    reward: string;
  }[];
}

export interface BeaconchainBlockRewardsGetResponse {
  execution_optimistic: boolean;
  finalized: boolean;
  data: {
    proposer_index: string;
    total: string;
    attestations: string;
    sync_aggregate: string;
    proposer_slashings: string;
    attester_slashings: string;
  };
}

export interface BeaconchainValidatorFromStateGetResponse {
  execution_optimistic: boolean;
  data: {
    index: string;
    balance: string;
    status: ValidatorStatus;
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

export interface BeaconchainValidatorStatePostResponse {
  execution_optimistic: boolean;
  finalized: boolean;
  data: {
    index: string;
    balance: string;
    status: ValidatorStatus;
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
  }[];
}

export interface BeaconchainBlockAttestationsGetResponse {
  execution_optimistic: boolean;
  finalized: boolean;
  data: {
    aggregation_bits: string;
    signature: string;
    data: {
      slot: string;
      index: string;
      beacon_block_root: string;
      source: {
        epoch: string;
        root: string;
      };
      target: {
        epoch: string;
        root: string;
      };
    };
  }[];
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

export interface BeaconchainLivenessPostResponse {
  data: {
    index: string;
    is_live: boolean;
  }[];
}

export type BlockId = "head" | "genesis" | "finalized" | string | `0x${string}`;

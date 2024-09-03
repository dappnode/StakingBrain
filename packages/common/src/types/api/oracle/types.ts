export interface SmoothValidator {
  status: MevSpSubscriptionStatus;
  accumulated_rewards_wei: string;
  pending_rewards_wei: string;
  collateral_wei: string;
  withdrawal_address: string;
  validator_index: number;
  validator_key: string;
  subscription_type: string;
}

export interface SmoothValidatorByIndexApiResponse {
  found_validators: SmoothValidator[];
  not_found_validators: number[];
}

export enum MevSpSubscriptionStatus {
  ACTIVE = "active",
  YELLOW_CARD = "yellowcard",
  RED_CARD = "redcard",
  BANNED = "banned",
  NOT_SUBSCRIBED = "notsubscribed",
  UNKNOWN = "unknown"
}

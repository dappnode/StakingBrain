export type Tag =
  | "obol"
  | "diva"
  | "ssv"
  | "rocketpool"
  | "stakewise"
  | "stakehouse"
  | "solo";

export interface ValidatorData {
  pubkey: {
    tag: Tag;
    validatorFeeRecipient: string;
    userFeeRecipient: string;
    isAutomaticImport: boolean;
  };
}

/**
 * Features shipped in code but switched off for now. Turning one back on needs no data migration:
 * the Brain keeps persisted settings (e.g. each validator's `builderConfig`) while a feature is off.
 * The object is mutable only so tests can exercise disabled features; application code must not write it.
 */
export const featureFlags = {
  /** Gloas/ePBS per-validator builder configuration: UI, RPCs, reload re-apply and BUILDER_IDS import. */
  builderConfig: false
};

export class FeatureDisabledError extends Error {
  constructor(feature: string) {
    super(`${feature} is disabled in this version of the Staking Brain`);
    this.name = "FeatureDisabledError";
  }
}

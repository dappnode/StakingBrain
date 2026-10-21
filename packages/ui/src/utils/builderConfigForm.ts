import { BuilderConfig, BuilderEntry, isValidBlsPubkey, validateBuilderConfig } from "@stakingbrain/common";

export interface OverrideInput {
  enabled: boolean;
  value: string;
}

export interface BuilderInput {
  id: string;
  url: string;
  authData: OverrideInput;
  publicKeys?: string[];
  minBid: OverrideInput;
  boost: OverrideInput;
  maxPayment: OverrideInput;
}

export interface BuilderConfigForm {
  minBid: OverrideInput;
  boost: OverrideInput;
  buildersMode: "custom" | "none";
  builders: BuilderInput[];
}

export type BuilderFormErrors = Record<string, string>;

export function splitBuilderPublicKeys(value: string): string[] {
  return value.split(/[,;\s]+/).filter(Boolean);
}

function override(value?: string): OverrideInput {
  return { enabled: value !== undefined, value: value ?? "" };
}

export function createBuilderInput(entry?: BuilderEntry): BuilderInput {
  return {
    id: crypto.randomUUID(),
    url: entry?.url ?? "",
    authData: override(entry?.auth_data),
    publicKeys: entry?.builder_pubkeys === undefined ? undefined : [...entry.builder_pubkeys],
    minBid: override(entry?.min_bid),
    boost: override(entry?.builder_boost_factor),
    maxPayment: override(entry?.max_execution_payment)
  };
}

/** Seed saved overrides only. Saving in Brain always replaces the direct-builder list explicitly. */
export function builderConfigToForm(config?: BuilderConfig | null): BuilderConfigForm {
  return {
    minBid: override(config?.min_bid),
    boost: override(config?.builder_boost_factor),
    buildersMode: config?.builders?.length ? "custom" : "none",
    builders: config?.builders?.map(createBuilderInput) ?? []
  };
}

function include(field: string, input: OverrideInput): Record<string, string> {
  return input.enabled ? { [field]: input.value.trim() } : {};
}

function buildConfig(form: BuilderConfigForm): BuilderConfig {
  return {
    ...include("min_bid", form.minBid),
    ...include("builder_boost_factor", form.boost),
    builders:
      form.buildersMode === "none"
        ? []
        : form.builders.map((entry) => ({
            url: entry.url.trim(),
            ...include("auth_data", entry.authData),
            ...include("min_bid", entry.minBid),
            ...include("builder_boost_factor", entry.boost),
            ...include("max_execution_payment", entry.maxPayment),
            ...(entry.publicKeys === undefined ? {} : { builder_pubkeys: entry.publicKeys.map((key) => key.trim()) })
          }))
  };
}

export function builderFormToConfig(form: BuilderConfigForm): BuilderConfig {
  const config = buildConfig(form);
  validateBuilderConfig(config);
  return config;
}

function invalid(config: BuilderConfig): boolean {
  try {
    validateBuilderConfig(config);
    return false;
  } catch {
    return true;
  }
}

const numberMessage = "Enter a whole number from 0 to 18446744073709551615.";

/** Validate every visible field so a failed save identifies all corrections in place. */
export function builderFormErrors(form: BuilderConfigForm): BuilderFormErrors {
  const errors: BuilderFormErrors = {};
  if (form.minBid.enabled && invalid({ min_bid: form.minBid.value.trim() })) errors.minBid = numberMessage;
  if (form.boost.enabled && invalid({ builder_boost_factor: form.boost.value.trim() })) errors.boost = numberMessage;
  if (form.buildersMode !== "custom") return errors;
  if (form.builders.length === 0) errors.builders = "Add a builder or choose No direct builders.";
  if (form.builders.length > 64) errors.builders = "You can configure up to 64 direct builders.";
  for (const entry of form.builders) {
    const prefix = `builders.${entry.id}`;
    if (invalid({ builders: [{ url: entry.url.trim() }] }))
      errors[`${prefix}.url`] =
        "Enter an HTTP or HTTPS URL, up to 2048 characters. Use punycode for internationalized hostnames.";
    if (
      entry.authData.enabled &&
      invalid({ builders: [{ url: "https://builder.example", auth_data: entry.authData.value.trim() }] })
    )
      errors[`${prefix}.authData`] = "Enter 1–4096 bytes of hexadecimal data, starting with 0x.";
    for (const [name, field] of [
      ["minBid", "min_bid"],
      ["boost", "builder_boost_factor"],
      ["maxPayment", "max_execution_payment"]
    ] as const) {
      const input = entry[name];
      if (input.enabled && invalid({ builders: [{ url: "https://builder.example", [field]: input.value.trim() }] }))
        errors[`${prefix}.${name}`] = numberMessage;
    }
    entry.publicKeys?.forEach((key, index) => {
      if (!isValidBlsPubkey(key.trim()))
        errors[`${prefix}.publicKeys.${index}`] = "Enter a 48-byte BLS public key starting with 0x.";
    });
    if ((entry.publicKeys?.length ?? 0) > 64)
      errors[`${prefix}.publicKeys`] = "You can allow up to 64 builder public keys.";
  }
  if (Object.keys(errors).length === 0) {
    try {
      builderFormToConfig(form);
    } catch (error) {
      const duplicate = error.message.match(/builders\[(\d+)\] duplicates/);
      if (duplicate)
        errors[`builders.${form.builders[Number(duplicate[1])].id}.url`] =
          "Another builder uses this URL and authorization. Change one or remove the duplicate.";
      else errors.builders = error.message;
    }
  }
  return errors;
}

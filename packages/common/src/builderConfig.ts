import { isValidBlsPubkey } from "./utils/index.js";

/** Keymanager overrides, not the resolved configuration returned by GET. Uint64s stay strings. */
export interface BuilderConfig {
  min_bid?: string;
  builder_boost_factor?: string;
  builders?: BuilderEntry[];
}

export interface BuilderEntry {
  url: string;
  auth_data?: string;
  builder_pubkeys?: string[];
  max_execution_payment?: string;
  min_bid?: string;
  builder_boost_factor?: string;
}

export interface BuilderConfigStatus {
  status: "pending" | "applied" | "error" | "unsupported";
  message?: string;
}

const uintFields = ["min_bid", "builder_boost_factor"];

function object(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function fields(value: Record<string, unknown>, allowed: string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label}.${key} is not supported`);
  }
}

function uint64(value: unknown, label: string): void {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,19})$/.test(value) || BigInt(value) > 18446744073709551615n)
    throw new Error(`${label} must be a decimal-string uint64 (0 to 18446744073709551615)`);
}

/** The Gloas default authorization identity. Do not persist this derived value as an override. */
export function defaultBuilderAuthData(url: string): string {
  const parsed = new URL(url);
  const authority = url.match(/^https?:\/\/([^/?#]*)/i)?.[1];
  if (!authority) throw new Error("Builder URL must have an HTTP(S) authority");
  const hostPort = authority.slice(authority.lastIndexOf("@") + 1);
  // URL.hostname canonicalizes IPv6 correctly, but also rewrites abbreviated/numeric
  // IPv4 hosts. Gloas only canonicalizes IPv6; preserve other ASCII hostname spelling.
  const hostname = hostPort.startsWith("[") ? parsed.hostname : hostPort.split(":")[0].toLowerCase();
  return "0x" + Array.from(new TextEncoder().encode(hostname), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Validate without coercing, resolving defaults, or dropping unknown input. */
export function validateBuilderConfig(value: unknown): asserts value is BuilderConfig {
  object(value, "builderConfig");
  fields(value, [...uintFields, "builders"], "builderConfig");
  for (const field of uintFields) if (field in value) uint64(value[field], field);
  if (!("builders" in value)) return;
  if (!Array.isArray(value.builders) || value.builders.length > 64)
    throw new Error("builders must be an array with at most 64 entries");

  const identities = new Set<string>();
  for (const [index, entry] of value.builders.entries()) {
    const label = `builders[${index}]`;
    object(entry, label);
    fields(entry, ["url", "auth_data", "builder_pubkeys", "max_execution_payment", ...uintFields], label);
    if (typeof entry.url !== "string" || entry.url.length === 0 || entry.url.length > 2048)
      throw new Error(`${label}.url must be a URI of 1 to 2048 characters`);
    // Builder requests use HTTP. ASCII URI spelling also keeps default auth data deterministic.
    let url: URL;
    try {
      url = new URL(entry.url);
    } catch {
      throw new Error(`${label}.url must be an absolute HTTP(S) URL`);
    }
    if (
      !/^https?:\/\//i.test(entry.url) ||
      !/^https?:$/.test(url.protocol) ||
      !url.hostname ||
      /[^a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%-]/.test(entry.url) ||
      /%(?![a-fA-F0-9]{2})/.test(entry.url)
    )
      throw new Error(`${label}.url must be an ASCII HTTP(S) URL (use punycode for internationalized hostnames)`);
    if (
      "auth_data" in entry &&
      (typeof entry.auth_data !== "string" || !/^0x(?:[a-fA-F0-9]{2}){1,4096}$/.test(entry.auth_data))
    )
      throw new Error(`${label}.auth_data must be 1 to 4096 bytes, hex encoded with 0x prefix`);
    if (
      "builder_pubkeys" in entry &&
      (!Array.isArray(entry.builder_pubkeys) ||
        entry.builder_pubkeys.length > 64 ||
        entry.builder_pubkeys.some((key) => typeof key !== "string" || !isValidBlsPubkey(key)))
    )
      throw new Error(`${label}.builder_pubkeys must contain at most 64 BLS public keys (48 bytes, 0x prefixed)`);
    for (const field of [...uintFields, "max_execution_payment"])
      if (field in entry) uint64(entry[field], `${label}.${field}`);
    const auth =
      typeof entry.auth_data === "string" ? entry.auth_data.toLowerCase() : defaultBuilderAuthData(entry.url);
    const identity = JSON.stringify([entry.url, auth]);
    if (identities.has(identity)) throw new Error(`${label} duplicates a builder URL and authorization identity`);
    identities.add(identity);
  }
}

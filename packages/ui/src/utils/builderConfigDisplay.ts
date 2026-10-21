import { BuilderConfig, BuilderEntry, defaultBuilderAuthData } from "@stakingbrain/common";

export const MAX_BUILDER_BOOST = "18446744073709551615";

function isUint64(value: string): boolean {
  return /^(0|[1-9][0-9]{0,19})$/.test(value) && BigInt(value) <= BigInt(MAX_BUILDER_BOOST);
}

export function formatBidAmount(value: string): string {
  return isUint64(value) ? `${BigInt(value).toLocaleString()} Gwei` : "Enter a valid amount above";
}

export function formatBidBoost(value: string): string {
  if (!isUint64(value)) return "Enter a valid percentage above";
  if (value === MAX_BUILDER_BOOST) return "MAX · Prefer builders";
  if (value === "0") return "0% · Prefer local";
  if (value === "100") return "100% · Equal weight";
  return `${BigInt(value).toLocaleString()}%`;
}

export interface BuilderComparisonRow {
  label: string;
  saved: string;
  effective: string;
  savedDetail?: string;
  effectiveDetail?: string;
}

export interface BuilderComparison {
  url: string;
  source?: "Saved only" | "Client only" | "Client default";
  rows: BuilderComparisonRow[];
}

function builderIdentity(entry: BuilderEntry): string {
  return JSON.stringify([entry.url, (entry.auth_data ?? defaultBuilderAuthData(entry.url)).toLowerCase()]);
}

function authorization(entry: BuilderEntry): string {
  return entry.auth_data === undefined || entry.auth_data.toLowerCase() === defaultBuilderAuthData(entry.url)
    ? "Builder hostname"
    : `Custom · ${(entry.auth_data.length - 2) / 2} bytes`;
}

function keys(entry: BuilderEntry): string {
  const count = entry.builder_pubkeys?.length ?? 0;
  return count ? `${count} specific ${count === 1 ? "key" : "keys"}` : "Any builder key";
}

/** Compare saved intent with GET values for display only; never fill form fields from GET. */
export function builderConfigComparison(
  saved?: BuilderConfig | null,
  resolved?: BuilderConfig
): { rows: BuilderComparisonRow[]; builders: BuilderComparison[] } {
  const unavailable = "Unavailable";
  const clientBuilders = resolved?.builders ?? [];
  const rows: BuilderComparisonRow[] = [
    {
      label: "Minimum bid",
      saved: saved?.min_bid === undefined ? "Client default" : formatBidAmount(saved.min_bid),
      effective: resolved?.min_bid === undefined ? unavailable : formatBidAmount(resolved.min_bid)
    },
    {
      label: "Bid boost",
      saved: saved?.builder_boost_factor === undefined ? "Client default" : formatBidBoost(saved.builder_boost_factor),
      effective:
        resolved?.builder_boost_factor === undefined ? unavailable : formatBidBoost(resolved.builder_boost_factor)
    },
    {
      label: "Direct builders",
      saved: saved?.builders === undefined ? "Client’s builder list" : `${saved.builders.length} configured`,
      effective: resolved?.builders === undefined ? unavailable : `${clientBuilders.length} configured`
    }
  ];
  const remaining = new Map(clientBuilders.map((entry) => [builderIdentity(entry), entry]));
  const pairs: { saved?: BuilderEntry; effective?: BuilderEntry; inherited?: boolean }[] = [];
  if (saved?.builders !== undefined) {
    for (const entry of saved.builders) {
      const identity = builderIdentity(entry);
      pairs.push({ saved: entry, effective: remaining.get(identity) });
      remaining.delete(identity);
    }
  }
  for (const entry of remaining.values()) {
    pairs.push({ effective: entry, inherited: saved?.builders === undefined });
  }
  const builders = pairs.map(({ saved: entry, effective, inherited }): BuilderComparison => {
    const absent = resolved === undefined ? unavailable : "Not on client";
    const savedValue = (value: string): string => (entry || inherited ? value : "Not in saved list");
    return {
      url: (entry ?? effective)!.url,
      source: inherited ? "Client default" : !entry ? "Client only" : !effective && resolved ? "Saved only" : undefined,
      rows: [
        {
          label: "Minimum bid",
          saved: savedValue(entry?.min_bid === undefined ? "Use global minimum bid" : formatBidAmount(entry.min_bid)),
          effective: !effective
            ? absent
            : effective.min_bid === undefined
              ? unavailable
              : formatBidAmount(effective.min_bid)
        },
        {
          label: "Bid boost",
          saved: savedValue(
            entry?.builder_boost_factor === undefined
              ? "Use global bid boost"
              : formatBidBoost(entry.builder_boost_factor)
          ),
          effective: !effective
            ? absent
            : effective.builder_boost_factor === undefined
              ? unavailable
              : formatBidBoost(effective.builder_boost_factor)
        },
        {
          label: "Execution payment limit",
          saved: savedValue(
            entry?.max_execution_payment === undefined ? "Client default" : formatBidAmount(entry.max_execution_payment)
          ),
          effective: !effective
            ? absent
            : effective.max_execution_payment === undefined
              ? unavailable
              : formatBidAmount(effective.max_execution_payment)
        },
        {
          label: "Authorization",
          saved: savedValue(entry ? authorization(entry) : "Builder hostname"),
          effective: effective ? authorization(effective) : absent
        },
        {
          label: "Accepted builder keys",
          saved: savedValue(entry ? keys(entry) : "Any builder key"),
          effective: effective ? keys(effective) : absent,
          savedDetail: entry?.builder_pubkeys?.join("\n"),
          effectiveDetail: effective?.builder_pubkeys?.join("\n")
        }
      ]
    };
  });
  return { rows, builders };
}

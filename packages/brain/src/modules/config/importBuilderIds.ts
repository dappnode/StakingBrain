import fs from "node:fs";
import { Network } from "@stakingbrain/common";
import { BrainDataBase } from "../db/index.js";
import { getBuilderRelayPresets } from "./builderRelayPresets.js";

/** Import preset choices once, before cron jobs and APIs start. */
export function importBuilderIds({
  builderIds,
  network,
  brainDb,
  markerPath
}: {
  builderIds: string | undefined;
  network: Network;
  brainDb: BrainDataBase;
  markerPath: string;
}): { imported: number; skipped: number } | undefined {
  if (!builderIds || fs.existsSync(markerPath)) return;
  const ids = [
    ...new Set(
      builderIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  ];
  if (ids.length === 0) return;
  const { relays } = getBuilderRelayPresets(network);
  const builderConfig = {
    builders: ids.map((id) => {
      const relay = relays.find((relay) => relay.id === id);
      if (!relay) throw new Error(`BUILDER_IDS contains an unknown builder ID for ${network}`);
      return { url: relay.url };
    })
  };

  const validators = Object.entries(brainDb.getData());
  const updates = validators
    .filter(([, details]) => details.builderConfig === undefined)
    .map(([pubkey]) => ({ pubkey, builderConfig }));
  const imported = updates.length;
  const skipped = validators.length - imported;
  if (imported > 0) brainDb.updateValidators(updates);

  // Mark completion only after saving. Retries preserve existing settings and edits.
  fs.writeFileSync(markerPath, "", { mode: 0o600, flag: "wx" });
  return { imported, skipped };
}

import { isValidNonWithdrawableBlsAddress, isValidWithdrawableBlsAddress } from "@stakingbrain/common";
import type { BeaconchainApi } from "../apiClients/index.js";
import type { BrainDataBase } from "../db/index.js";
import { storedPubkeys } from "../db/utils.js";
import logger from "../logger/index.js";

/** Beacon lookups per request; large key sets need only a few requests per refresh. */
export const BEACON_CHUNK_SIZE = 500;
/** A slow or syncing beacon node must not hold up a refresh for long. */
export const BEACON_TIMEOUT_MS = 30_000;

export type WithdrawalCredentialsFormat = "ecdsa" | "bls" | "unknown" | "error";

export interface BeaconStatusView {
  index?: string;
  withdrawalCredentials: { format: WithdrawalCredentialsFormat; address: string };
  /** Not looked up yet; the Brain pushes validatorsChanged when the lookup completes. */
  beaconPending: boolean;
  /** Why the lookup failed, while no earlier result is available. */
  beaconError?: string;
}

interface Entry {
  /** null: unknown to the beacon chain (e.g. deposit not processed yet). */
  beacon?: { index: string; withdrawalCredentials: string } | null;
  error?: string;
}

const key = (pubkey: string) => pubkey.toLowerCase();

/**
 * Beacon chain details (index, withdrawal credentials) for every validator, fetched with bulk requests
 * by its own periodic job, so neither listing validators nor reconciling clients waits on the beacon
 * node. Validators added to the database are looked up as soon as the change is announced, and every
 * change here is announced in turn so open UIs refresh. Indexes are persisted for the Brain API.
 */
export class BeaconStatusStore {
  private entries = new Map<string, Entry>();
  private queue?: Set<string> | "all";
  private run?: Promise<void>;

  constructor(
    private readonly brainDb: BrainDataBase,
    private readonly beaconchainApi: BeaconchainApi
  ) {
    brainDb.onChange(() => {
      // Only keys never attempted: failed lookups wait for the periodic job, so a failure that is
      // itself announced cannot trigger another lookup.
      const unseen = Object.keys(this.brainDb.getData()).filter((pubkey) => !this.entries.has(key(pubkey)));
      if (unseen.length > 0)
        this.refresh(unseen).catch((e) => logger.error("Error looking up new validators on the beacon chain", e));
    });
  }

  /**
   * Look up the given validators, or all of them. Calls while a lookup runs merge into one follow-up;
   * the periodic job skips ticks while it is still running, so slow lookups never pile up.
   */
  refresh(pubkeys?: readonly string[]): Promise<void> {
    if (pubkeys === undefined || this.queue === "all") this.queue = "all";
    else this.queue = new Set([...(this.queue ?? []), ...pubkeys.map(key)]);
    this.run ??= this.drain().finally(() => (this.run = undefined));
    return this.run;
  }

  /** Resolves once no lookup is running, e.g. before closing the database. */
  async whenIdle(): Promise<void> {
    while (this.run) await this.run.catch(() => undefined);
  }

  view(pubkey: string): BeaconStatusView {
    const entry = this.entries.get(key(pubkey));
    const address = entry?.beacon?.withdrawalCredentials ?? "";
    return {
      index: entry?.beacon?.index,
      withdrawalCredentials: {
        address,
        format: entry?.beacon
          ? isValidWithdrawableBlsAddress(address)
            ? "ecdsa"
            : isValidNonWithdrawableBlsAddress(address)
              ? "bls"
              : "unknown"
          : "error"
      },
      beaconPending: entry === undefined,
      beaconError: entry?.beacon === undefined ? entry?.error : undefined
    };
  }

  private async drain(): Promise<void> {
    while (this.queue) {
      const queued = this.queue;
      this.queue = undefined;
      const stored = storedPubkeys(this.brainDb.getData());
      // Forget validators that left the database, so a later re-import starts fresh.
      for (const pubkey of this.entries.keys()) if (!stored.has(pubkey)) this.entries.delete(pubkey);
      const targets =
        queued === "all" ? [...stored.values()] : [...queued].flatMap((pubkey) => stored.get(pubkey) ?? []);
      for (let start = 0; start < targets.length; start += BEACON_CHUNK_SIZE)
        await this.lookUp(targets.slice(start, start + BEACON_CHUNK_SIZE));
    }
  }

  private async lookUp(pubkeys: string[]): Promise<void> {
    let changed = false;
    try {
      const { data } = await this.beaconchainApi.postStateValidators({
        stateId: "head",
        body: { ids: pubkeys, statuses: [] },
        timeout: BEACON_TIMEOUT_MS
      });
      const found = new Map(data.map((validator) => [key(validator.validator.pubkey), validator]));
      const stored = this.brainDb.getData();
      const indexUpdates: { pubkey: string; index: number }[] = [];
      for (const pubkey of pubkeys) {
        const validator = found.get(key(pubkey));
        const beacon = validator
          ? { index: validator.index, withdrawalCredentials: validator.validator.withdrawal_credentials }
          : null;
        const current = this.entries.get(key(pubkey));
        const same =
          current?.error === undefined &&
          current !== undefined &&
          (current.beacon === beacon ||
            (!!current.beacon &&
              !!beacon &&
              current.beacon.index === beacon.index &&
              current.beacon.withdrawalCredentials === beacon.withdrawalCredentials));
        if (!same) {
          this.entries.set(key(pubkey), { beacon });
          changed = true;
        }
        // Persist indexes: the Brain API serves them and other tools (e.g. Lido CSM) rely on them.
        if (validator && stored[pubkey] && stored[pubkey].index !== Number(validator.index))
          indexUpdates.push({ pubkey, index: Number(validator.index) });
      }
      if (indexUpdates.length > 0) this.brainDb.updateValidators(indexUpdates);
    } catch (e) {
      logger.error("Unable to look up validators on the beacon chain", e);
      const error = `Could not reach the beacon node: ${e.message}`;
      // Keep earlier results; rows never looked up report the failure instead of waiting forever.
      for (const pubkey of pubkeys) {
        const current = this.entries.get(key(pubkey));
        if (current?.error === error) continue;
        this.entries.set(key(pubkey), { beacon: current?.beacon, error });
        changed = true;
      }
    }
    if (changed) this.brainDb.notifyChanged();
  }
}

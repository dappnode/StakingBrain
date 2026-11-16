import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

/** Minimal in-memory stand-ins for web3signer, a validator client and a beacon node, served over real HTTP. */

type Started = { url: string; close: () => Promise<void> };

async function serve(app: express.Express): Promise<Started> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      })
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const prefixed = (pubkey: string) => (pubkey.startsWith("0x") ? pubkey : `0x${pubkey}`).toLowerCase();

export class FakeSigner {
  keys = new Set<string>();
  importRequests: { pubkeys: string[]; slashingPubkeys?: string[] }[] = [];
  /** Simulated keystore decryption time. */
  importDelayPerKeyMs = 0;
  /** 1-based import call number that answers HTTP 500, as a crashed or overloaded signer would. */
  failImportCall?: number;

  async start(): Promise<Started> {
    const app = express();
    app.use(express.json({ limit: "64mb" }));
    app.get("/upcheck", (_req, res) => {
      res.type("text/plain").send("OK");
    });
    app.get("/eth/v1/keystores", (_req, res) => {
      res.json({
        data: [...this.keys].map((validating_pubkey) => ({ validating_pubkey, derivation_path: "", readonly: false }))
      });
    });
    app.post("/eth/v1/keystores", async (req, res) => {
      const { keystores, passwords, slashing_protection } = req.body as {
        keystores: string[];
        passwords: string[];
        slashing_protection?: string;
      };
      const pubkeys = keystores.map((keystore) => prefixed(JSON.parse(keystore).pubkey));
      this.importRequests.push({
        pubkeys,
        slashingPubkeys: slashing_protection
          ? JSON.parse(slashing_protection).data.map(({ pubkey }: { pubkey: string }) => prefixed(pubkey))
          : undefined
      });
      await delay(this.importDelayPerKeyMs * keystores.length);
      if (this.importRequests.length === this.failImportCall) {
        res.status(500).json({ message: "Internal signer error" });
        return;
      }
      res.json({
        data: pubkeys.map((pubkey, index) => {
          if (passwords[index] !== "password") return { status: "error", message: "Invalid password" };
          if (this.keys.has(pubkey)) return { status: "duplicate", message: "" };
          this.keys.add(pubkey);
          return { status: "imported", message: "" };
        })
      });
    });
    app.delete("/eth/v1/keystores", (req, res) => {
      const pubkeys = (req.body.pubkeys as string[]).map(prefixed);
      res.json({
        data: pubkeys.map((pubkey) => ({ status: this.keys.delete(pubkey) ? "deleted" : "not_found", message: "" })),
        slashing_protection: JSON.stringify({ metadata: {}, data: [] })
      });
    });
    return serve(app);
  }
}

export class FakeValidatorClient {
  remoteKeys = new Map<string, string>();
  feeRecipients = new Map<string, string>();
  /** Every request path, to assert what the Brain did (and did not) call. */
  paths: string[] = [];
  /** Simulated latency of a busy validator client on every write. */
  writeDelayMs = 0;
  /** Answer every request with 503, as a restarting client would. */
  unavailable = false;

  async start(): Promise<Started> {
    const app = express();
    app.use(express.json({ limit: "64mb" }));
    app.use(async (req, res, next) => {
      this.paths.push(`${req.method} ${req.path}`);
      if (this.unavailable) {
        res.status(503).json({ message: "Validator client is restarting" });
        return;
      }
      if (req.method !== "GET") await delay(this.writeDelayMs);
      next();
    });
    app.get("/eth/v1/remotekeys", (_req, res) => {
      res.json({ data: [...this.remoteKeys].map(([pubkey, url]) => ({ pubkey, url, readonly: false })) });
    });
    app.post("/eth/v1/remotekeys", (req, res) => {
      const remoteKeys = req.body.remote_keys as { pubkey: string; url: string }[];
      res.json({
        data: remoteKeys.map(({ pubkey, url }) => {
          const key = prefixed(pubkey);
          const status = this.remoteKeys.has(key) ? "DUPLICATE" : "IMPORTED";
          this.remoteKeys.set(key, url);
          return { status, message: "" };
        })
      });
    });
    app.delete("/eth/v1/remotekeys", (req, res) => {
      res.json({
        data: (req.body.pubkeys as string[]).map((pubkey) => ({
          status: this.remoteKeys.delete(prefixed(pubkey)) ? "DELETED" : "NOT_FOUND",
          message: ""
        }))
      });
    });
    app.get("/eth/v1/validator/:pubkey/feerecipient", (req, res) => {
      const ethaddress = this.feeRecipients.get(prefixed(req.params.pubkey));
      if (!ethaddress) res.status(404).json({ message: "Validator not found" });
      else res.json({ data: { pubkey: req.params.pubkey, ethaddress } });
    });
    app.post("/eth/v1/validator/:pubkey/feerecipient", (req, res) => {
      this.feeRecipients.set(prefixed(req.params.pubkey), req.body.ethaddress);
      res.status(202).end();
    });
    app.delete("/eth/v1/validator/:pubkey/feerecipient", (req, res) => {
      this.feeRecipients.delete(prefixed(req.params.pubkey));
      res.status(204).end();
    });
    return serve(app);
  }
}

export class FakeBeaconNode {
  indexes = new Map<string, number>();
  /** Simulated per-validator lookup latency of a busy or syncing beacon node. */
  lookupDelayMs = 0;
  lookups = 0;
  /** Simulated latency of one bulk lookup, whatever its size. */
  bulkDelayMs = 0;
  bulkLookups: number[] = [];
  unavailable = false;

  async start(): Promise<Started> {
    const app = express();
    app.use(express.json({ limit: "64mb" }));
    app.post("/eth/v1/beacon/states/head/validators", async (req, res) => {
      const ids = (req.body.ids as string[]).map(prefixed);
      this.bulkLookups.push(ids.length);
      await delay(this.bulkDelayMs);
      if (this.unavailable) {
        res.status(503).json({ message: "Beacon node is syncing" });
        return;
      }
      res.json({
        execution_optimistic: false,
        finalized: false,
        data: ids.flatMap((pubkey) => {
          const index = this.indexes.get(pubkey);
          return index === undefined
            ? []
            : [
                {
                  index: String(index),
                  balance: "32000000000",
                  status: "active_ongoing",
                  validator: { pubkey, withdrawal_credentials: "0x01" + "00".repeat(11) + "ab".repeat(20) }
                }
              ];
        })
      });
    });
    app.get("/eth/v1/beacon/states/head/validators/:pubkey", async (req, res) => {
      this.lookups++;
      // Stop early when the Brain aborts the request at its deadline.
      let closed = false;
      req.on("close", () => (closed = true));
      await delay(this.lookupDelayMs);
      if (closed) return;
      const pubkey = prefixed(req.params.pubkey);
      const index = this.indexes.get(pubkey);
      if (index === undefined) {
        res.status(404).json({ message: "Validator not found" });
        return;
      }
      res.json({
        execution_optimistic: false,
        data: {
          index: String(index),
          balance: "32000000000",
          status: "active_ongoing",
          validator: {
            pubkey,
            withdrawal_credentials: "0x01" + "00".repeat(11) + "ab".repeat(20),
            effective_balance: "32000000000",
            slashed: false,
            activation_eligibility_epoch: "0",
            activation_epoch: "0",
            exit_epoch: "18446744073709551615",
            withdrawable_epoch: "18446744073709551615"
          }
        }
      });
    });
    return serve(app);
  }
}

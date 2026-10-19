import type { JSX } from "react";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from "@mui/material";
import { BuilderConfig, shortenPubkey, validateBuilderConfig } from "@stakingbrain/common";
import type { CustomValidatorGetResponse, ValidatorBuilderConfigResponse } from "@stakingbrain/brain";
import { rpcClient } from "../../socket";

export default function BuilderConfigDialog({
  validators,
  setOpen
}: {
  validators: CustomValidatorGetResponse[];
  setOpen: (open: boolean) => void;
}): JSX.Element {
  // Only original persisted overrides may seed the editor; GET values are read-only.
  const initial = validators.length === 1 ? validators[0].builderConfig : undefined;
  const [minBid, setMinBid] = useState(initial?.min_bid ?? "");
  const [boost, setBoost] = useState(initial?.builder_boost_factor ?? "");
  const [builders, setBuilders] = useState(
    initial?.builders === undefined ? "" : JSON.stringify(initial.builders, null, 2)
  );
  const [details, setDetails] = useState<ValidatorBuilderConfigResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function refresh(): Promise<void> {
    setReading(true);
    try {
      setDetails(
        await rpcClient.call(
          "getBuilderConfigs",
          validators.map(({ pubkey }) => pubkey)
        )
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setReading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function save(reset: boolean): Promise<void> {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const config: BuilderConfig = reset
        ? {}
        : {
            ...(minBid === "" ? {} : { min_bid: minBid }),
            ...(boost === "" ? {} : { builder_boost_factor: boost }),
            ...(builders.trim() === "" ? {} : { builders: JSON.parse(builders) })
          };
      if (!reset) validateBuilderConfig(config);
      await rpcClient.call(
        "updateValidators",
        validators.map(({ pubkey }) => ({ pubkey, builderConfig: reset ? null : config }))
      );
      if (reset) {
        setMinBid("");
        setBoost("");
        setBuilders("");
      }
      setSuccess(
        reset
          ? "Reset saved and accepted by the validator client."
          : "Overrides saved and accepted by the validator client."
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  return (
    <Dialog open onClose={() => !busy && setOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>Gloas / ePBS builder configuration</DialogTitle>
      <DialogContent>
        <Typography paragraph>
          Editing {validators.length} validator(s). Save replaces all builder overrides for every selected validator.
          Blank fields inherit validator client defaults. Reset removes overrides and follows those defaults in full.
        </Typography>
        {validators.length > 1 && (
          <Alert severity="warning">
            Bulk editing starts with blank fields. Saving applies the same replacement to all selected validators.
          </Alert>
        )}
        <Typography paragraph>
          The existing fee recipient remains the payment destination, including Smooth’s pool payout address. Gloas
          protocol payments target bid.fee_recipient, which can differ from the execution payload fee recipient. Smooth
          handles payment detection and reward accounting.
        </Typography>
        <TextField
          margin="normal"
          fullWidth
          label="Minimum bid (Gwei, decimal string)"
          value={minBid}
          onChange={(event) => setMinBid(event.target.value)}
          helperText="Applies to public P2P bids and entries without their own min_bid."
        />
        <TextField
          margin="normal"
          fullWidth
          label="Builder boost factor (decimal string)"
          value={boost}
          onChange={(event) => setBoost(event.target.value)}
          helperText="100 maximizes payment. Zero prefers local building unless upstream errors make it unviable. Entries can override this value."
        />
        <TextField
          margin="normal"
          fullWidth
          multiline
          minRows={7}
          label="Direct builder entries (JSON array)"
          value={builders}
          onChange={(event) => setBuilders(event.target.value)}
          placeholder={'[\n  { "url": "https://builder.example.com", "max_execution_payment": "0" }\n]'}
          helperText="Blank inherits the client’s builder list. [] disables direct builder requests; public P2P bids and local building remain available. Up to 64 entries."
        />
        <Typography paragraph>
          Each entry requires url (HTTP/S, up to 2048 characters). Optional fields: auth_data (0x-prefixed hex, 1–4096
          bytes), builder_pubkeys (up to 64 BLS public keys; empty accepts any), max_execution_payment, min_bid and
          builder_boost_factor. All numeric values must be quoted decimal strings between 0 and 18446744073709551615.
        </Typography>
        <Typography paragraph>
          max_execution_payment caps the trusted execution payment counted in bid selection, in Gwei. Zero counts none;
          it does not prove that no additional payment can arrive. Omitted limits follow client defaults. Entry min_bid
          and boost inherit the values above, then client defaults.
        </Typography>
        <Typography paragraph>
          Stored auth_data becomes signed authorization inside the validator client. Omit it to let the client derive it
          from the builder URL’s hostname. Entries may share a URL only with different authorization bytes. Brain does
          not sign slot requests or select bids.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        <Box sx={{ mt: 2 }}>
          <Button disabled={busy || reading} onClick={() => void refresh()}>
            Refresh client status
          </Button>
          {reading && <CircularProgress size={18} />}
          {details.map((detail) => (
            <Box key={detail.pubkey} sx={{ mt: 2 }}>
              <Typography>
                {shortenPubkey(detail.pubkey)} — {detail.application?.status ?? "Unmanaged (no saved override)"}
              </Typography>
              {detail.application?.message && <Alert severity="warning">{detail.application.message}</Alert>}
              {detail.status === "error" && (
                <Alert severity="warning">
                  {detail.message} Ordinary key and fee-recipient management remain available.
                </Alert>
              )}
              <details>
                <summary>Saved overrides</summary>
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {detail.builderConfig === undefined
                    ? "Unmanaged"
                    : detail.builderConfig === null
                      ? "Reset to validator defaults"
                      : JSON.stringify(detail.builderConfig, null, 2)}
                </pre>
              </details>
              {detail.resolved && (
                <details>
                  <summary>Resolved client values (read only)</summary>
                  <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {JSON.stringify(detail.resolved, null, 2)}
                  </pre>
                </details>
              )}
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setOpen(false)}>
          Close
        </Button>
        <Button disabled={busy || reading} onClick={() => void save(true)}>
          Reset to validator defaults
        </Button>
        <Button disabled={busy || reading} variant="contained" onClick={() => void save(false)}>
          Save overrides
        </Button>
      </DialogActions>
    </Dialog>
  );
}

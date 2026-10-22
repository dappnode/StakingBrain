import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TuneIcon from "@mui/icons-material/Tune";
import { Network, shortenPubkey } from "@stakingbrain/common";
import type { CustomValidatorGetResponse, ValidatorBuilderConfigResponse } from "@stakingbrain/brain";
import { rpcClient } from "../../socket";
import {
  builderConfigToForm,
  builderFormErrors,
  builderFormToConfig,
  createBuilderInput,
  BuilderConfigForm
} from "../../utils/builderConfigForm";
import { BuilderCard, NumberOverrideField } from "../BuilderConfig/BuilderConfigFields";
import BuilderConfigSummary from "../BuilderConfig/BuilderConfigSummary";
import RelayPresetSelector from "../BuilderConfig/RelayPresetSelector";

export default function BuilderConfigDialog({
  validators,
  network,
  setOpen
}: {
  validators: CustomValidatorGetResponse[];
  network: Network;
  setOpen: (open: boolean) => void;
}): JSX.Element {
  const [form, setForm] = useState(() =>
    builderConfigToForm(validators.length === 1 ? validators[0].builderConfig : undefined)
  );
  const [details, setDetails] = useState<ValidatorBuilderConfigResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const refreshId = useRef(0);
  const errors = useMemo(() => (submitted ? builderFormErrors(form) : {}), [form, submitted]);
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));
  const bulk = validators.length > 1;
  const inheritsBuilderList = (details.length ? details : validators).some(
    ({ builderConfig }) => builderConfig?.builders === undefined
  );
  const problems = details.filter(
    (detail) =>
      detail.status === "error" ||
      detail.application?.status === "error" ||
      detail.application?.status === "unsupported"
  );

  function update(next: BuilderConfigForm): void {
    setForm(next);
    setError("");
    setSuccess("");
  }

  async function refresh(): Promise<void> {
    const id = ++refreshId.current;
    setReading(true);
    try {
      const result = await rpcClient.call(
        "getBuilderConfigs",
        validators.map(({ pubkey }) => pubkey)
      );
      if (id === refreshId.current) setDetails(result);
    } catch (error) {
      if (id === refreshId.current) setError(error.message);
    } finally {
      if (id === refreshId.current) setReading(false);
    }
  }

  useEffect(() => {
    void refresh();
    return () => {
      refreshId.current++;
    };
  }, []);

  async function save(reset: boolean): Promise<void> {
    setError("");
    setSuccess("");
    if (!reset) {
      setSubmitted(true);
      if (Object.keys(builderFormErrors(form)).length > 0) {
        setAdvancedExpanded(true);
        requestAnimationFrame(() =>
          contentRef.current?.querySelector<HTMLInputElement>("[aria-invalid='true']")?.focus()
        );
        return;
      }
    }
    setBusy(true);
    // An earlier read must not replace the status of this save when it finishes.
    refreshId.current++;
    setReading(false);
    try {
      const config = reset ? null : builderFormToConfig(form);
      await rpcClient.call(
        "updateValidators",
        validators.map(({ pubkey }) => ({ pubkey, builderConfig: config }))
      );
      if (reset) {
        setForm(builderConfigToForm(null));
        setSubmitted(false);
      }
      setSuccess(
        reset
          ? "All overrides reset to client defaults, including the direct-builder list. Saving here again will replace that list."
          : `Builder settings saved for ${validators.length === 1 ? "this validator" : `all ${validators.length} validators`}.`
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  return (
    <Dialog
      open
      onClose={() => !busy && setOpen(false)}
      disableEscapeKeyDown={busy}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="builder-settings-title"
      slotProps={{ paper: { sx: { borderRadius: { sm: 3 }, maxHeight: { sm: "94dvh" } } } }}
    >
      <DialogTitle component="div" sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                p: 1,
                borderRadius: 2,
                bgcolor: "action.selected",
                color: "primary.main"
              }}
            >
              <TuneIcon />
            </Box>
            <Box>
              <Typography id="builder-settings-title" variant="h6" component="h2" fontWeight={700}>
                Builder settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose how your validators source and compare bids.
              </Typography>
            </Box>
          </Stack>
          <IconButton disabled={busy} aria-label="Close builder settings" onClick={() => setOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
          <Chip
            size="small"
            label={bulk ? `${validators.length} validators selected` : shortenPubkey(validators[0]?.pubkey)}
          />
          <Chip size="small" variant="outlined" label="Gloas / ePBS" />
          <Chip size="small" variant="outlined" label={network === Network.Hoodi ? "Hoodi testnet" : network} />
          {reading && (
            <Chip size="small" variant="outlined" icon={<CircularProgress size={12} />} label="Checking client…" />
          )}
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent ref={contentRef} sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <Stack spacing={3}>
          {bulk && (
            <Alert severity="warning">
              You’re editing {validators.length} validators together. Saving replaces their builder settings with the
              choices below. Bid preferences start at client defaults, with no direct builders selected.
            </Alert>
          )}
          <Box component="fieldset" disabled={busy} sx={{ m: 0, p: 0, border: 0, minWidth: 0 }}>
            <Stack spacing={3}>
              <RelayPresetSelector
                network={network}
                form={form}
                onChange={update}
                onAdvancedSettings={() => setAdvancedExpanded(true)}
              />
              {inheritsBuilderList && (
                <Typography variant="body2" color="text.secondary">
                  Saving replaces the client’s direct-builder list with your selection.
                </Typography>
              )}
              <Accordion
                expanded={advancedExpanded}
                onChange={(_, expanded) => setAdvancedExpanded(expanded)}
                disableGutters
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: "12px !important",
                  "&::before": { display: "none" }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="advanced-builder-settings">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      Advanced settings
                    </Typography>
                    {(form.minBid.enabled ||
                      form.boost.enabled ||
                      form.builders.some(
                        (entry) =>
                          entry.authData.enabled ||
                          entry.minBid.enabled ||
                          entry.boost.enabled ||
                          entry.maxPayment.enabled ||
                          entry.publicKeys !== undefined
                      )) && <Chip size="small" label="Custom overrides" />}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails id="advanced-builder-settings">
                  <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                        Global bid preferences
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        These values apply to public P2P bids and every builder below. Per-builder settings can override
                        them for that builder only.
                      </Typography>
                      <Stack spacing={3}>
                        <NumberOverrideField
                          label="Minimum bid"
                          input={form.minBid}
                          onChange={(minBid) => update({ ...form, minBid })}
                          inherited="Use client default"
                          unit="Gwei"
                          error={errors.minBid}
                          description="The minimum payment to accept. Switch off the default to set your own amount in whole Gwei."
                        />
                        <Divider />
                        <NumberOverrideField
                          label="Bid boost"
                          input={form.boost}
                          onChange={(boost) => update({ ...form, boost })}
                          inherited="Use client default"
                          unit="%"
                          fallback="100"
                          error={errors.boost}
                          presets
                          description="100% gives bids equal weight against local building. 50% counts half a bid’s payment; 150% counts 1.5 times. This changes selection weight, not the payment you receive. Zero prefers local building; MAX prefers builder bids, subject to upstream fallback and health checks."
                        />
                      </Stack>
                    </Paper>
                    <Box component="section">
                      <Typography variant="subtitle1" fontWeight={700}>
                        Custom endpoints and relay overrides
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Edit selected relays or add any HTTP(S) builder endpoint. Changes here update the relay
                        selection above.
                      </Typography>
                      {errors.builders && (
                        <Alert severity="error" sx={{ mt: 1.5 }}>
                          {errors.builders}
                        </Alert>
                      )}
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        {(form.buildersMode === "custom" ? form.builders : []).map((entry, index) => (
                          <BuilderCard
                            key={entry.id}
                            entry={entry}
                            index={index}
                            errors={errors}
                            globalMinBid={form.minBid}
                            globalBoost={form.boost}
                            onChange={(changed) =>
                              update({
                                ...form,
                                builders: form.builders.map((current) => (current.id === entry.id ? changed : current))
                              })
                            }
                            onRemove={() => {
                              const remaining = form.builders.filter((current) => current.id !== entry.id);
                              update({
                                ...form,
                                builders: remaining,
                                buildersMode: remaining.length ? "custom" : "none"
                              });
                            }}
                          />
                        ))}
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Button
                            startIcon={<AddIcon />}
                            variant="outlined"
                            sx={{ textTransform: "none" }}
                            disabled={form.builders.length >= 64}
                            onClick={() =>
                              update({
                                ...form,
                                buildersMode: "custom",
                                builders: [
                                  ...(form.buildersMode === "custom" ? form.builders : []),
                                  createBuilderInput()
                                ]
                              })
                            }
                          >
                            Add builder
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            {form.builders.length} of 64 builders
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          </Box>
          {Object.keys(errors).length > 0 && (
            <Alert severity="error" role="alert">
              Check the highlighted fields before saving.
            </Alert>
          )}
          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" role="status">
              {success}
            </Alert>
          )}
          {problems.length > 0 && (
            <Alert severity="warning">
              {problems.length === 1
                ? (problems[0].application?.message ?? problems[0].message)
                : `${problems.length} validators need attention. Review validator status below for details.`}{" "}
              Key and fee-recipient management remain available.
            </Alert>
          )}
          <Accordion
            disableGutters
            elevation={0}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: "12px !important",
              "&::before": { display: "none" }
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" fontWeight={600}>
                Saved settings and validator status
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Brain saves your choices and sends them to your validator software. Compare those choices with the
                    settings the software reports using. “Client default” lets it choose; “Use global” follows your
                    saved bid preferences. Unsaved edits aren’t shown.
                  </Typography>
                  <Tooltip title="Refresh validator status">
                    <span>
                      <IconButton
                        aria-label="Refresh validator status"
                        disabled={busy || reading}
                        onClick={() => void refresh()}
                      >
                        {reading ? <CircularProgress size={20} /> : <RefreshIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
                {details.map((detail) => (
                  <Box key={detail.pubkey}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="body2" fontFamily="monospace">
                        {shortenPubkey(detail.pubkey)}
                      </Typography>
                      <Chip
                        size="small"
                        color={
                          detail.application?.status === "applied"
                            ? "success"
                            : detail.application?.status === "error" || detail.application?.status === "unsupported"
                              ? "warning"
                              : "default"
                        }
                        label={
                          detail.application?.status === "applied"
                            ? "Settings sent successfully"
                            : detail.application?.status === "unsupported"
                              ? "Unsupported"
                              : detail.application?.status === "error"
                                ? "Needs attention"
                                : detail.application?.status === "pending"
                                  ? "Pending"
                                  : "Using validator defaults"
                        }
                      />
                    </Stack>
                    {detail.application?.message && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        {detail.application.message}
                      </Alert>
                    )}
                    {detail.status === "error" && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        {detail.message} Key and fee-recipient management remain available.
                      </Alert>
                    )}
                    <BuilderConfigSummary saved={detail.builderConfig} resolved={detail.resolved} />
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          justifyContent: advancedExpanded ? "space-between" : "flex-end",
          flexWrap: "wrap",
          gap: 1
        }}
      >
        <Tooltip title="Remove all overrides, including the direct-builder list. Any builders configured on the client become effective again.">
          <span hidden={!advancedExpanded}>
            <Button
              startIcon={<RestartAltIcon />}
              disabled={busy}
              onClick={() => void save(true)}
              sx={{ textTransform: "none" }}
            >
              Restore client defaults
            </Button>
          </span>
        </Tooltip>
        <Stack direction="row" spacing={1}>
          <Button disabled={busy} onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
          <Button
            disabled={busy}
            variant="contained"
            onClick={() => void save(false)}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            {busy ? "Saving…" : bulk ? `Apply to ${validators.length} validators` : "Save settings"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

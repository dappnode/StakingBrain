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
  FormControl,
  FormLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import { shortenPubkey } from "@stakingbrain/common";
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

export default function BuilderConfigDialog({
  validators,
  setOpen
}: {
  validators: CustomValidatorGetResponse[];
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
  const contentRef = useRef<HTMLDivElement>(null);
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
    if (!reset) {
      setSubmitted(true);
      if (Object.keys(builderFormErrors(form)).length > 0) {
        requestAnimationFrame(() =>
          contentRef.current?.querySelector<HTMLInputElement>("[aria-invalid='true']")?.focus()
        );
        return;
      }
    }
    setBusy(true);
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
      await refresh();
      setBusy(false);
    }
  }

  function chooseBuilders(mode: BuilderConfigForm["buildersMode"]): void {
    update({
      ...form,
      buildersMode: mode,
      builders: mode === "custom" && form.builders.length === 0 ? [createBuilderInput()] : form.builders
    });
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
              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                  Global bid preferences
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  These values apply to public P2P bids and every builder below. A builder’s advanced settings can
                  override them for that builder only.
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
                <FormControl fullWidth size="small">
                  <FormLabel
                    id="direct-builders-label"
                    sx={{ mb: 1, typography: "subtitle1", color: "text.primary", fontWeight: 700 }}
                  >
                    Direct builders
                  </FormLabel>
                  <Select
                    labelId="direct-builders-label"
                    value={form.buildersMode}
                    onChange={(event) => chooseBuilders(event.target.value)}
                  >
                    <MenuItem value="custom">Configure direct builders</MenuItem>
                    <MenuItem value="none">No direct builders</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                  {form.buildersMode === "none"
                    ? "Saving disables direct builder requests. Public P2P bids and local building remain available."
                    : "Saving uses only the builders below for direct bid requests. Public P2P bids and local building remain available."}
                </Typography>
                {inheritsBuilderList && (
                  <Alert severity="info" sx={{ mt: 1.5 }}>
                    The saved configuration currently leaves the builder list to the client. Saving here replaces that
                    list with your choice above.
                  </Alert>
                )}
                {errors.builders && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    {errors.builders}
                  </Alert>
                )}
                {form.buildersMode === "custom" && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {form.builders.map((entry, index) => (
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
                          update({ ...form, builders: remaining, buildersMode: remaining.length ? "custom" : "none" });
                        }}
                      />
                    ))}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Button
                        startIcon={<AddIcon />}
                        variant="outlined"
                        sx={{ textTransform: "none" }}
                        disabled={form.builders.length >= 64}
                        onClick={() => update({ ...form, builders: [...form.builders, createBuilderInput()] })}
                      >
                        Add builder
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        {form.builders.length} of 64 builders
                      </Typography>
                    </Stack>
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>
          <Alert severity="info" variant="outlined">
            Your fee recipient stays the payment destination, including Smooth’s pool address. Gloas protocol payments
            target the bid’s fee recipient; the execution payload may use a different address. Smooth continues to
            handle payment detection and rewards.
          </Alert>
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
                : `${problems.length} validators need attention. Review client status below for details.`}{" "}
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
                Saved choices vs. client
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Compare the last saved choices with current client values. “Client default” keeps following the
                    client; “Use global” follows that validator’s saved global preferences. Unsaved edits are not shown
                    here.
                  </Typography>
                  <Tooltip title="Refresh client status">
                    <span>
                      <IconButton
                        aria-label="Refresh client status"
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
                            ? "Last apply succeeded"
                            : detail.application?.status === "unsupported"
                              ? "Unsupported"
                              : detail.application?.status === "error"
                                ? "Needs attention"
                                : detail.application?.status === "pending"
                                  ? "Pending"
                                  : "Using client settings"
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
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Tooltip title="Remove all overrides, including the direct-builder list. Any builders configured on the client become effective again.">
          <span>
            <Button
              startIcon={<RestartAltIcon />}
              disabled={busy || reading}
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
            disabled={busy || reading}
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

import type { JSX } from "react";
import { useEffect, useState } from "react";
import { Alert, Box, Button, ButtonBase, Chip, CircularProgress, Link, Stack, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { alpha } from "@mui/material/styles";
import { BuilderRelayPresets, Network } from "@stakingbrain/common";
import { rpcClient } from "../../socket";
import { BuilderConfigForm, matchesRelayPreset, toggleRelayPreset } from "../../utils/builderConfigForm";

export default function RelayPresetSelector({
  network,
  form,
  onChange,
  onAdvancedSettings
}: {
  network: Network;
  form: BuilderConfigForm;
  onChange: (form: BuilderConfigForm) => void;
  onAdvancedSettings: () => void;
}): JSX.Element {
  const [catalog, setCatalog] = useState<BuilderRelayPresets>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setCatalog(undefined);
    setError("");
    void rpcClient.call("getBuilderRelayPresets", undefined).then(
      (result) => {
        if (!active) return;
        if (result.network !== network) {
          setError("The relay network does not match this page. Reload the page to try again.");
          return;
        }
        setCatalog(result);
      },
      (error) => {
        if (active) setError(error.message);
      }
    );
    return () => {
      active = false;
    };
  }, [network, attempt]);

  const builders = form.buildersMode === "custom" ? form.builders : [];
  const customCount = catalog
    ? builders.filter((entry) => !catalog.relays.some((preset) => matchesRelayPreset(entry, preset))).length
    : 0;
  return (
    <Box component="section" aria-labelledby="relay-presets-label">
      <Typography id="relay-presets-label" variant="subtitle1" fontWeight={700}>
        Relays
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Select the {network === Network.Hoodi ? "Hoodi" : network} ePBS relays you want to use.
      </Typography>
      {error ? (
        <Alert severity="warning" action={<Button onClick={() => setAttempt((current) => current + 1)}>Retry</Button>}>
          Relay presets could not be loaded. {error} You can still edit endpoints in Advanced settings.
        </Alert>
      ) : !catalog ? (
        <Stack direction="row" alignItems="center" spacing={1} role="status">
          <CircularProgress size={16} />
          <Typography variant="body2">Loading relay presets…</Typography>
        </Stack>
      ) : catalog.relays.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No ePBS relay presets are available for this network yet. Add custom endpoints in Advanced settings.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {catalog.relays.map((preset) => {
            const checked = builders.some((entry) => matchesRelayPreset(entry, preset));
            const disabled = !checked && builders.length >= 64;
            return (
              <Box
                key={preset.id}
                sx={(theme) => ({
                  position: "relative",
                  m: 0,
                  px: 2,
                  py: 1.5,
                  border: 1,
                  borderColor: checked ? "primary.main" : "divider",
                  bgcolor: checked ? alpha(theme.palette.primary.main, 0.07) : "background.paper",
                  borderRadius: 2,
                  transition: "background-color 150ms, border-color 150ms"
                })}
              >
                <ButtonBase
                  disabled={disabled}
                  aria-label={`${preset.name} relay`}
                  aria-pressed={checked}
                  onClick={() => onChange(toggleRelayPreset(form, preset, !checked))}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    "&:hover": { bgcolor: "action.hover" },
                    "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 }
                  }}
                />
                <Box
                  sx={{
                    position: "relative",
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1.5,
                    opacity: disabled ? 0.5 : 1
                  }}
                >
                  <Box sx={{ width: 130 }}>
                    <Link
                      href={preset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      underline="hover"
                      aria-label={`Visit ${preset.name} relay`}
                      sx={{
                        pointerEvents: "auto",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontWeight: 600
                      }}
                    >
                      {preset.name}
                      <OpenInNewIcon sx={{ fontSize: 12 }} />
                    </Link>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flex: 1, minWidth: 160, overflowWrap: "anywhere" }}
                  >
                    {new URL(preset.url).hostname}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`OFAC filtering: ${preset.ofacFiltering === "yes" ? "Yes" : preset.ofacFiltering === "no" ? "No" : "Unknown"}`}
                  />
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ minWidth: 88, color: checked ? "primary.main" : "text.secondary" }}
                    aria-hidden="true"
                  >
                    {checked ? <CheckCircleRoundedIcon fontSize="small" /> : <AddRoundedIcon fontSize="small" />}
                    <Typography variant="caption" fontWeight={600}>
                      {checked ? "Selected" : "Select"}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
      {customCount > 0 && (
        <Button size="small" onClick={onAdvancedSettings} sx={{ mt: 1, textTransform: "none" }}>
          {customCount} custom {customCount === 1 ? "endpoint" : "endpoints"} configured · Edit in Advanced settings
        </Button>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {builders.length === 0
          ? "No direct relays selected. Public P2P bids and local building remain available."
          : `${builders.length} direct ${builders.length === 1 ? "endpoint" : "endpoints"} selected. Public P2P bids and local building remain available.`}
      </Typography>
      {catalog && catalog.relays.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          OFAC filtering excludes blocks involving sanctioned addresses.
        </Typography>
      )}
    </Box>
  );
}

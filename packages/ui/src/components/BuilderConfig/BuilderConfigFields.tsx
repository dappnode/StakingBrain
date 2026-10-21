import type { JSX } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { BuilderFormErrors, BuilderInput, OverrideInput, splitBuilderPublicKeys } from "../../utils/builderConfigForm";
import { formatBidAmount, formatBidBoost, MAX_BUILDER_BOOST } from "../../utils/builderConfigDisplay";

export function NumberOverrideField({
  label,
  input,
  onChange,
  inherited,
  description,
  unit,
  fallback = "0",
  error,
  presets = false
}: {
  label: string;
  input: OverrideInput;
  onChange: (input: OverrideInput) => void;
  inherited: string;
  description: string;
  unit?: string;
  fallback?: string;
  error?: string;
  presets?: boolean;
}): JSX.Element {
  const maximumBoost = presets && input.value === MAX_BUILDER_BOOST;
  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Typography component="span" fontWeight={600}>
          {label}
        </Typography>
        <FormControlLabel
          sx={{ mr: 0 }}
          label={<Typography variant="body2">{inherited}</Typography>}
          control={
            <Switch
              size="small"
              checked={!input.enabled}
              onChange={(_, checked) => onChange({ enabled: !checked, value: input.value || fallback })}
              slotProps={{ input: { "aria-label": `${label}: ${inherited}` } }}
            />
          }
        />
      </Stack>
      {input.enabled ? (
        <TextField
          fullWidth
          size="small"
          label={label}
          value={maximumBoost ? "MAX" : input.value}
          onChange={(event) => onChange({ enabled: true, value: event.target.value })}
          error={!!error}
          helperText={error || description}
          slotProps={{
            htmlInput: { inputMode: maximumBoost ? undefined : "numeric" },
            input: {
              readOnly: maximumBoost,
              endAdornment: unit && !maximumBoost ? <InputAdornment position="end">{unit}</InputAdornment> : undefined
            }
          }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      {input.enabled && maximumBoost && (
        <Button size="small" onClick={() => onChange({ enabled: true, value: "100" })} sx={{ textTransform: "none" }}>
          Enter a custom percentage
        </Button>
      )}
      {presets && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
          <Chip
            size="small"
            variant={input.enabled && input.value === "0" ? "filled" : "outlined"}
            color={input.enabled && input.value === "0" ? "primary" : "default"}
            label="Prefer local"
            onClick={() => onChange({ enabled: true, value: "0" })}
          />
          <Chip
            size="small"
            variant={input.enabled && input.value === "100" ? "filled" : "outlined"}
            color={input.enabled && input.value === "100" ? "primary" : "default"}
            label="Highest payment"
            onClick={() => onChange({ enabled: true, value: "100" })}
          />
          <Tooltip
            describeChild
            title="MAX is the protocol’s maximum boost. Prefer builder bids unless errors or health checks make them unviable."
          >
            <Chip
              size="small"
              variant={input.enabled && maximumBoost ? "filled" : "outlined"}
              color={input.enabled && maximumBoost ? "primary" : "default"}
              label="Prefer builders · MAX"
              onClick={() => onChange({ enabled: true, value: MAX_BUILDER_BOOST })}
            />
          </Tooltip>
        </Stack>
      )}
    </Box>
  );
}

export function BuilderCard({
  entry,
  index,
  onChange,
  onRemove,
  errors,
  globalMinBid,
  globalBoost
}: {
  entry: BuilderInput;
  index: number;
  onChange: (entry: BuilderInput) => void;
  onRemove: () => void;
  errors: BuilderFormErrors;
  globalMinBid: OverrideInput;
  globalBoost: OverrideInput;
}): JSX.Element {
  const prefix = `builders.${entry.id}`;
  const advancedError = Object.keys(errors).some((key) => key.startsWith(prefix + ".") && key !== `${prefix}.url`);
  const customCount = [
    entry.authData.enabled,
    entry.maxPayment.enabled,
    entry.minBid.enabled,
    entry.boost.enabled,
    (entry.publicKeys?.length ?? 0) > 0
  ].filter(Boolean).length;
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ borderRadius: 2.5, overflow: "hidden" }}
      aria-label={`Direct builder ${index + 1}`}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 26,
              height: 26,
              display: "grid",
              placeItems: "center",
              bgcolor: "action.selected",
              borderRadius: 1,
              fontSize: 13,
              fontWeight: 700
            }}
          >
            {index + 1}
          </Box>
          <Typography fontWeight={600}>Direct builder</Typography>
        </Stack>
        <Tooltip title="Remove builder">
          <IconButton aria-label={`Remove builder ${index + 1}`} onClick={onRemove} size="small">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ p: 2.5, pt: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Builder URL"
          placeholder="https://builder.example.com"
          value={entry.url}
          onChange={(event) => onChange({ ...entry, url: event.target.value })}
          error={!!errors[`${prefix}.url`]}
          helperText={errors[`${prefix}.url`] || "Use the endpoint provided by your builder."}
          slotProps={{ htmlInput: { inputMode: "url", autoCapitalize: "none", spellCheck: false } }}
        />
      </Box>
      <Accordion
        defaultExpanded={advancedError}
        key={advancedError ? "errors" : "settings"}
        disableGutters
        elevation={0}
        sx={{ borderTop: 1, borderColor: "divider", "&::before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SettingsOutlinedIcon fontSize="small" color="action" />
            <Typography variant="body2" fontWeight={500}>
              Advanced settings
            </Typography>
            {customCount > 0 && <Chip size="small" label={`${customCount} custom`} />}
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              These settings apply only to this builder URL. Minimum bid and boost follow Global bid preferences above
              until you override them here.
            </Typography>
            <NumberOverrideField
              label="Execution payment limit"
              input={entry.maxPayment}
              onChange={(maxPayment) => onChange({ ...entry, maxPayment })}
              inherited="Use client default"
              unit="Gwei"
              error={errors[`${prefix}.maxPayment`]}
              description="Limits how much trusted execution payment counts when comparing bids. Zero counts none; extra payment may still arrive."
            />
            <NumberOverrideField
              label="Minimum bid override"
              input={entry.minBid}
              onChange={(minBid) => onChange({ ...entry, minBid })}
              inherited="Use global minimum bid"
              unit="Gwei"
              error={errors[`${prefix}.minBid`]}
              description={`Global minimum bid above: ${globalMinBid.enabled ? formatBidAmount(globalMinBid.value) : "follows the client default"}. Turn off this switch to set a different minimum for this builder only.`}
            />
            <NumberOverrideField
              label="Bid boost override"
              input={entry.boost}
              onChange={(boost) => onChange({ ...entry, boost })}
              inherited="Use global bid boost"
              unit="%"
              fallback="100"
              error={errors[`${prefix}.boost`]}
              presets
              description={`Global bid boost above: ${globalBoost.enabled ? formatBidBoost(globalBoost.value) : "follows the client default"}. Turn off this switch to weight this builder differently. 100% is equal weight; 50% counts half and 150% counts 1.5 times for comparison only. Zero prefers local building; MAX prefers this builder, subject to upstream fallback and health checks.`}
            />
            <Box>
              <FormControl fullWidth size="small">
                <FormLabel sx={{ mb: 1, typography: "body2", fontWeight: 600 }} id={`${entry.id}-auth-label`}>
                  Request authorization
                </FormLabel>
                <Select
                  labelId={`${entry.id}-auth-label`}
                  value={entry.authData.enabled ? "custom" : "hostname"}
                  onChange={(event) =>
                    onChange({ ...entry, authData: { ...entry.authData, enabled: event.target.value === "custom" } })
                  }
                >
                  <MenuItem value="hostname">Use the builder’s hostname</MenuItem>
                  <MenuItem value="custom">Use authorization data from the builder</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                The validator client signs this authorization for builder requests.
              </Typography>
              {entry.authData.enabled && (
                <TextField
                  fullWidth
                  size="small"
                  sx={{ mt: 1.5 }}
                  label="Authorization data"
                  value={entry.authData.value}
                  onChange={(event) => onChange({ ...entry, authData: { enabled: true, value: event.target.value } })}
                  placeholder="0x…"
                  error={!!errors[`${prefix}.authData`]}
                  helperText={
                    errors[`${prefix}.authData`] ||
                    "Paste the hexadecimal data agreed with your builder (1–4096 bytes)."
                  }
                  slotProps={{ htmlInput: { autoCapitalize: "none", spellCheck: false, autoComplete: "off" } }}
                />
              )}
            </Box>
            <Box>
              <FormControl fullWidth size="small">
                <FormLabel sx={{ mb: 1, typography: "body2", fontWeight: 600 }} id={`${entry.id}-keys-label`}>
                  Accepted builder public keys
                </FormLabel>
                <Select
                  labelId={`${entry.id}-keys-label`}
                  value={entry.publicKeys?.length ? "restricted" : "any"}
                  onChange={(event) => onChange({ ...entry, publicKeys: event.target.value === "any" ? [] : [""] })}
                >
                  <MenuItem value="any">Accept any builder public key</MenuItem>
                  <MenuItem value="restricted">Only accept specific public keys</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This filters bids returned by this URL by the builder’s signing identity. Accept any applies no key
                filter; specific keys accept only bids signed by those keys. Get these BLS public keys from your
                builder; they are different from your validator keys. This does not filter public P2P bids or other
                builder entries.
              </Typography>
              {(entry.publicKeys?.length ?? 0) > 0 && (
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  {entry.publicKeys?.map((key, keyIndex) => (
                    <Stack key={keyIndex} direction="row" alignItems="flex-start" spacing={0.5}>
                      <TextField
                        fullWidth
                        size="small"
                        label={`Builder public key ${keyIndex + 1}`}
                        value={key}
                        placeholder="0x…"
                        error={!!errors[`${prefix}.publicKeys.${keyIndex}`]}
                        helperText={
                          errors[`${prefix}.publicKeys.${keyIndex}`] ||
                          (keyIndex === 0
                            ? "You can paste multiple keys separated by commas, spaces, or newlines."
                            : undefined)
                        }
                        onPaste={(event) => {
                          const pasted = splitBuilderPublicKeys(event.clipboardData.getData("text"));
                          if (pasted.length > 1) {
                            event.preventDefault();
                            onChange({
                              ...entry,
                              publicKeys: [
                                ...(entry.publicKeys ?? []).slice(0, keyIndex),
                                ...pasted,
                                ...(entry.publicKeys ?? []).slice(keyIndex + 1)
                              ]
                            });
                          }
                        }}
                        slotProps={{ htmlInput: { autoCapitalize: "none", spellCheck: false } }}
                        onChange={(event) =>
                          onChange({
                            ...entry,
                            publicKeys: entry.publicKeys?.map((value, current) =>
                              current === keyIndex ? event.target.value : value
                            )
                          })
                        }
                      />
                      <IconButton
                        aria-label={`Remove public key ${keyIndex + 1} from builder ${index + 1}`}
                        onClick={() =>
                          onChange({
                            ...entry,
                            publicKeys: entry.publicKeys?.filter((_, current) => current !== keyIndex)
                          })
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    sx={{ alignSelf: "flex-start", textTransform: "none" }}
                    disabled={(entry.publicKeys?.length ?? 0) >= 64}
                    onClick={() => onChange({ ...entry, publicKeys: [...(entry.publicKeys ?? []), ""] })}
                  >
                    Add public key
                  </Button>
                  {errors[`${prefix}.publicKeys`] && (
                    <Typography color="error" variant="body2">
                      {errors[`${prefix}.publicKeys`]}
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

import type { JSX } from "react";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
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
  const hasErrors = Object.keys(errors).some((key) => key.startsWith(prefix + "."));
  const [expanded, setExpanded] = useState(() => !entry.url.trim());
  useEffect(() => {
    if (hasErrors) setExpanded(true);
  }, [hasErrors]);
  let title: string;
  try {
    title = new URL(entry.url).hostname;
  } catch {
    title = entry.url.trim() || "New builder";
  }
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
      <Stack direction="row" alignItems="center" sx={{ pr: 1 }}>
        <Button
          color="inherit"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls={`${entry.id}-settings`}
          sx={{
            flex: 1,
            minWidth: 0,
            p: 2,
            gap: 1,
            justifyContent: "flex-start",
            textTransform: "none",
            borderRadius: 0
          }}
        >
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
          <Box sx={{ minWidth: 0, textAlign: "left" }}>
            <Typography component="span" fontWeight={600} sx={{ display: "block", overflowWrap: "anywhere" }}>
              {title}
            </Typography>
            <Typography component="span" variant="caption" color="text.secondary">
              Builder {index + 1}
            </Typography>
          </Box>
          {customCount > 0 && <Chip size="small" label={`${customCount} custom`} />}
          <ExpandMoreIcon sx={{ ml: "auto", transform: expanded ? "rotate(180deg)" : undefined, flexShrink: 0 }} />
        </Button>
        <Tooltip title="Remove builder">
          <IconButton aria-label={`Remove builder ${index + 1}`} onClick={onRemove} size="small">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Collapse in={expanded} id={`${entry.id}-settings`}>
        <Box sx={{ p: 2.5, pt: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Builder URL"
            placeholder="https://builder.example.com"
            value={entry.url}
            onChange={(event) => onChange({ ...entry, url: event.target.value })}
            error={!!errors[`${prefix}.url`]}
            helperText={errors[`${prefix}.url`]}
            slotProps={{ htmlInput: { inputMode: "url", autoCapitalize: "none", spellCheck: false } }}
          />
        </Box>
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <Stack spacing={3}>
            <NumberOverrideField
              label="Execution payment limit"
              input={entry.maxPayment}
              onChange={(maxPayment) => onChange({ ...entry, maxPayment })}
              inherited="Use client default"
              unit="Gwei"
              error={errors[`${prefix}.maxPayment`]}
              description="Cap counted toward bid value. Zero counts none."
            />
            <NumberOverrideField
              label="Minimum bid"
              input={entry.minBid}
              onChange={(minBid) => onChange({ ...entry, minBid })}
              inherited="Use global"
              unit="Gwei"
              error={errors[`${prefix}.minBid`]}
              description={`Global: ${globalMinBid.enabled ? formatBidAmount(globalMinBid.value) : "client default"}.`}
            />
            <NumberOverrideField
              label="Bid boost"
              input={entry.boost}
              onChange={(boost) => onChange({ ...entry, boost })}
              inherited="Use global"
              unit="%"
              fallback="100"
              error={errors[`${prefix}.boost`]}
              presets
              description={`Global: ${globalBoost.enabled ? formatBidBoost(globalBoost.value) : "client default"}.`}
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
                  helperText={errors[`${prefix}.authData`] || "Hex data from your builder (1–4096 bytes)."}
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
                          (keyIndex === 0 ? "Paste builder BLS keys, separated by commas or spaces." : undefined)
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
        </Box>
      </Collapse>
    </Paper>
  );
}

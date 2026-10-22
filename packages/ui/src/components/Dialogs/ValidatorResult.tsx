import { Chip, Paper, Stack, Typography } from "@mui/material";
import { shortenPubkey } from "@stakingbrain/common";

export default function ValidatorResult({
  pubkey,
  status,
  message
}: {
  pubkey: string;
  status: string;
  message?: string;
}) {
  const color = ["imported", "deleted", "Exited"].includes(status)
    ? "success"
    : ["error", "Not exited"].includes(status)
      ? "error"
      : "default";
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="body2" fontFamily="monospace">
          {shortenPubkey(pubkey)}
        </Typography>
        <Chip size="small" variant="outlined" label={status} color={color} />
      </Stack>
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, overflowWrap: "anywhere" }}>
          {message}
        </Typography>
      )}
    </Paper>
  );
}

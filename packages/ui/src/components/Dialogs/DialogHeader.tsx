import type { ReactNode } from "react";
import { Box, Chip, DialogTitle, Divider, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function DialogHeader({
  title,
  subtitle,
  icon,
  count,
  onClose,
  busy = false
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  count?: number;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <>
      <DialogTitle component="div" sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
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
              {icon}
            </Box>
            <Box>
              <Typography id="alert-dialog-title" component="h2" variant="h6">
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label={`Close ${title.toLowerCase()}`} disabled={busy} onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
        {count !== undefined && (
          <Chip size="small" sx={{ mt: 2 }} label={`${count} ${count === 1 ? "validator" : "validators"} selected`} />
        )}
      </DialogTitle>
      <Divider />
    </>
  );
}

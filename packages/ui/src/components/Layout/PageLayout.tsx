import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

export default function PageLayout({ children, maxWidth = 1280 }: { children: ReactNode; maxWidth?: number }) {
  return (
    <Box component="main" sx={{ width: "100%", maxWidth, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3}>{children}</Stack>
    </Box>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  action
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", sm: "center" }}
      spacing={2}
    >
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
          <Typography component="h1" variant="h6">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

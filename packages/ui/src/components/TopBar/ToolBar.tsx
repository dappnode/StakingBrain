import type { JSX } from "react";
import { Box, capitalize, Chip, IconButton, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import { Network } from "@stakingbrain/common";

export default function ToolBar({
  mode,
  setMode,
  userMode,
  setUserMode,
  network
}: {
  mode: "light" | "dark";
  setMode: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  userMode: "basic" | "advanced";
  setUserMode: React.Dispatch<React.SetStateAction<"basic" | "advanced">>;
  network?: Network;
}): JSX.Element {
  return (
    <Toolbar sx={{ width: "100%", maxWidth: 1280, mx: "auto", gap: 2, py: 1 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Box component="img" src="/assets/dappnode_logo_clean.png" alt="Dappnode" sx={{ width: 36, height: 36 }} />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 0.5, sm: 1.5 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: 16, sm: 20 } }}>
            Staking Brain
          </Typography>
          {network && <Chip size="small" variant="outlined" label={capitalize(network)} />}
        </Stack>
      </Stack>
      <Stack direction="row" spacing={0.5}>
        <Tooltip title={mode === "dark" ? "Use light mode" : "Use dark mode"}>
          <IconButton
            aria-label={mode === "dark" ? "Use light mode" : "Use dark mode"}
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
          >
            {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title={userMode === "basic" ? "Show advanced information" : "Hide advanced information"}>
          <IconButton
            aria-label="Advanced information"
            aria-pressed={userMode === "advanced"}
            color={userMode === "advanced" ? "primary" : "default"}
            onClick={() => setUserMode(userMode === "basic" ? "advanced" : "basic")}
          >
            {userMode === "basic" ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
          </IconButton>
        </Tooltip>
      </Stack>
    </Toolbar>
  );
}

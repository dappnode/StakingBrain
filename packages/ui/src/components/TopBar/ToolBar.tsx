import Toolbar from "@mui/material/Toolbar";
import { HeaderTypography } from "../../Styles/Typographies";
import { Box, capitalize, Typography } from "@mui/material";
import IconButton from "@mui/material/IconButton";
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
    <Toolbar>
      <Box
        sx={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
          lineHeight: "50px"
        }}
      >
        <img src="/assets/dappnode_logo_clean.png" alt="logo" height={50} style={{ marginRight: "5px" }} />

        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" }
          }}
        >
          <HeaderTypography
            sx={{ flexGrow: 1, fontWeight: "bold", fontSize: { xs: "14px", sm: "20px" } }}
            text={"Staking Brain"}
          />
          {network && (
            <Typography
              sx={{ fontStyle: "italic", fontSize: { xs: "14px", sm: "20px" }, marginLeft: { xs: 0, sm: 1 } }}
            >
              {capitalize(network)}
            </Typography>
          )}
        </Box>
      </Box>
      <div style={{ marginLeft: "auto" }}>
        <Box
          sx={{
            padding: 0.5,
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <IconButton sx={{ ml: 1 }} onClick={() => setMode(mode === "dark" ? "light" : "dark")} color="inherit">
            {mode === "dark" ? (
              <LightModeIcon titleAccess="Set Light Mode" />
            ) : (
              <DarkModeIcon titleAccess="Set Dark Mode" />
            )}
          </IconButton>
          <IconButton
            sx={{ ml: 1 }}
            onClick={() => setUserMode(userMode === "basic" ? "advanced" : "basic")}
            color="inherit"
          >
            {userMode === "basic" ? (
              <UnfoldMoreIcon titleAccess="Expand Andanced Info" />
            ) : (
              <UnfoldLessIcon titleAccess="Collapse Advanced Info" />
            )}
          </IconButton>
        </Box>
      </div>
    </Toolbar>
  );
}

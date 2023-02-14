import Toolbar from "@mui/material/Toolbar";
import { HeaderTypography } from "../../Styles/Typographies";
import { Box, Chip } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import BuildIcon from "@mui/icons-material/Build";
import PersonIcon from "@mui/icons-material/Person";
import { Network } from "@stakingbrain/common";

export default function ToolBar({
  mode,
  setMode,
  userMode,
  setUserMode,
  network,
}: {
  mode: "light" | "dark";
  setMode: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  userMode: "basic" | "advanced";
  setUserMode: React.Dispatch<React.SetStateAction<"basic" | "advanced">>;
  network?: Network;
}): JSX.Element {
  return (
    <Toolbar>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
          lineHeight: "50px",
        }}
      >
        <img src="/assets/dappnode_logo.png" alt="logo" height={50} />
        <HeaderTypography
          sx={{ flexGrow: 1, fontWeight: "bold" }}
          text={"Staking Brain"}
        />
        {network && (
          <>
            &nbsp;&nbsp;
            <Chip color="secondary" label={network} />
          </>
        )}
      </div>
      <div style={{ marginLeft: "auto" }}>
        <Box
          sx={{
            padding: 0.5,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <IconButton
            sx={{ ml: 1 }}
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            color="inherit"
          >
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <IconButton
            sx={{ ml: 1 }}
            onClick={() =>
              setUserMode(userMode === "basic" ? "advanced" : "basic")
            }
            color="inherit"
          >
            {userMode === "basic" ? <BuildIcon /> : <PersonIcon />}
          </IconButton>
        </Box>
      </div>
    </Toolbar>
  );
}

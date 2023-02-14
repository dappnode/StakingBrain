import { AppBar } from "@mui/material";
import ToolBar from "./ToolBar";
import { Network } from "@stakingbrain/common";

export default function TopBar({
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
    <AppBar position="static">
      <ToolBar
        network={network}
        mode={mode}
        setMode={setMode}
        userMode={userMode}
        setUserMode={setUserMode}
      />
    </AppBar>
  );
}

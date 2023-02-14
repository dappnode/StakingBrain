import { AppBar } from "@mui/material";
import ToolBar from "./ToolBar";

export default function TopBar({
  mode,
  setMode,
  userMode,
  setUserMode,
}: {
  mode: "light" | "dark";
  setMode: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  userMode: "basic" | "advanced";
  setUserMode: React.Dispatch<React.SetStateAction<"basic" | "advanced">>;
}): JSX.Element {
  return (
    <AppBar position="static">
      <ToolBar
        mode={mode}
        setMode={setMode}
        userMode={userMode}
        setUserMode={setUserMode}
      />
    </AppBar>
  );
}

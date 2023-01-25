//External components
import { AppBar } from "@mui/material";

//Internal components
import ToolBar from "./ToolBar";
import { Network } from "@stakingbrain/common";

export default function TopBar({
  network,
  signerStatus,
}: {
  network?: Network;
  signerStatus: string;
}): JSX.Element {
  return (
    <AppBar position="static">
      <ToolBar network={network} signerStatus={signerStatus} />
    </AppBar>
  );
}

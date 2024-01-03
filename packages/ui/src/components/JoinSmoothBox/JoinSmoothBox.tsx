import { Switch, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { Network, smoothFeeRecipient } from "@stakingbrain/common";

export default function JoinSmoothBox({
  willJoinSmooth,
  setWillJoinSmooth,
  index,
  feeRecipients,
  setFeeRecipients,
  network,
}: {
  willJoinSmooth: boolean[];
  setWillJoinSmooth: (willJoinSmooth: boolean[]) => void;
  index: number;
  feeRecipients: string[];
  setFeeRecipients: (feeRecipients: string[]) => void;
  network: Network;
}): JSX.Element {
  return (
    <>
      <Box
        sx={{
          marginY: 2,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Switch
          defaultChecked={willJoinSmooth[index === -1 ? 0 : index]}
          onChange={(e) => {
            const newFeeRecipients = [...feeRecipients];
            const newWillJoinSmooth = [...willJoinSmooth];
            if (index === -1) {
              newFeeRecipients.fill(
                e.target.checked
                  ? smoothFeeRecipient(network) !== null
                    ? smoothFeeRecipient(network)!
                    : ""
                  : ""
              );
              newWillJoinSmooth.fill(e.target.checked);
            } else {
              newFeeRecipients[index] = e.target.checked
                ? smoothFeeRecipient(network) !== null
                  ? smoothFeeRecipient(network)!
                  : ""
                : "";
              newWillJoinSmooth[index] = e.target.checked;
            }
            setWillJoinSmooth([...newWillJoinSmooth]);
            setFeeRecipients([...newFeeRecipients]);
          }}
        />
        <Typography
          variant="subtitle1"
          sx={{
            marginTop: 1,
            color: willJoinSmooth[index === -1 ? 0 : index] ? "black" : "gray",
          }}
        >
          <b>
            {willJoinSmooth[index === -1 ? 0 : index]
              ? "I'm joining DAppNode Smooth!"
              : "I want to join DAppNode Smooth!"}
          </b>
        </Typography>
      </Box>

      {willJoinSmooth[index === -1 ? 0 : index] ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 1,
            marginBottom: 2,
            padding: 2,
            backgroundColor: "#fff8e6",
            borderLeft: "5px solid #e6a700",
            borderRadius: 2,
            width: "50%",
          }}
        >
          <Typography variant="subtitle1">
            <b>CAUTION</b>
          </Typography>

          <Typography variant="subtitle1">
            <ul>
              <li>
                By checking this option you acknowledge having read and
                understood the{" "}
                <a target="_blank" href="https://docs.dappnode.io/docs/smooth">
                  <b>Smooth Documentation.</b>
                </a>
              </li>
              <li>
                {" "}
                This way you will be subscribed to the Smoothing Pool once you
                propose a block.
              </li>
              <li>
                If you ever want to change the fee of this validator, make sure
                that you have first unsuscribed from the Smoothing Pool in order
                to not be banned from it!
              </li>
            </ul>
          </Typography>
        </Box>
      ) : (
        <></>
      )}
    </>
  );
}

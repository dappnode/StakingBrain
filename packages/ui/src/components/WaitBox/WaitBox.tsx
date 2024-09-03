import { Box, CircularProgress, DialogContentText } from "@mui/material";

export default function WaitBox(): JSX.Element {
  return (
    <Box
      sx={{
        margin: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >
      <CircularProgress
        sx={{
          marginBottom: 4
        }}
      />
      <DialogContentText id="alert-dialog-description">Please wait</DialogContentText>
    </Box>
  );
}

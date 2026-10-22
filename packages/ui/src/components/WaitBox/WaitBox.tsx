import type { JSX } from "react";
import { Box, CircularProgress, DialogContentText } from "@mui/material";

export default function WaitBox(): JSX.Element {
  return (
    <Box
      sx={{
        py: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >
      <CircularProgress size={28} sx={{ mb: 2 }} />
      <DialogContentText id="alert-dialog-description">Please wait</DialogContentText>
    </Box>
  );
}

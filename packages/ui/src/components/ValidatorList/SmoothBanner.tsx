import { Alert, Box } from "@mui/material";

export const SmoothBanner = () => {
  return (
    <Box sx={{ marginBottom: 3 }}>
      <Alert severity="info" variant="filled">
        🎉 Calling all solo stakers: Smooth has arrived! To join, select your validators and click on change fee recipient.  Learn more{" "}
        <strong><a href="https://smooth.dappnode.io/" target="_blank" rel="noopener noreferrer">here!</a></strong>
      </Alert>
    </Box>
  );
};

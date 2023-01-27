import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  DialogActions,
} from "@mui/material";
import { Link } from "react-router-dom";
import { getEmoji, shortenPubkey } from "../../logic/Utils/dataUtils";
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import { KeystoreInfo } from "../../types";
import WaitBox from "../WaitBox/WaitBox";
import { Web3signerPostResponse } from "@stakingbrain/common";

export default function ImportDialog({
  open,
  setOpen,
  keystoresPostResponse,
  keystoresPostError,
  importStatus,
  acceptedFiles,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  keystoresPostResponse: Web3signerPostResponse | undefined;
  keystoresPostError: string | undefined;
  importStatus: string;
  acceptedFiles: KeystoreInfo[];
}): JSX.Element {
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog
      disableEscapeKeyDown={true}
      open={open}
      fullWidth={true}
      onClose={(event, reason) => {
        if (!reason) {
          handleClose();
        }
      }}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title" sx={{ fontWeight: "bolder" }}>
        {importStatus}
      </DialogTitle>
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {keystoresPostError ? (
            `Error: ${keystoresPostError}`
          ) : keystoresPostResponse ? (
            <div>
              {keystoresPostResponse.data.map((result, index) => (
                <div style={{ marginBottom: "20px" }} key={index}>
                  <Typography variant="h5" color="GrayText">
                    {shortenPubkey(acceptedFiles[index]?.pubkey)}
                  </Typography>
                  <Typography variant="h6">
                    <b>Status:</b> {result.status} {getEmoji(result.status)}
                  </Typography>
                  {result.message ? (
                    <Typography variant="h6">
                      <b>Message:</b> {result.message}
                    </Typography>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <WaitBox />
          )}
        </Box>
      </DialogContent>
      {keystoresPostResponse ? (
        <DialogActions>
          <Link to={{ pathname: "/", search: window.location.search }}>
            <Button
              onClick={handleClose}
              variant="contained"
              sx={{ borderRadius: 3 }}
            >
              Close
            </Button>
          </Link>
        </DialogActions>
      ) : null}
    </Dialog>
  );
}

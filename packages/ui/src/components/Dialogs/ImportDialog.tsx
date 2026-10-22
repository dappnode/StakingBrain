import type { JSX } from "react";
import {
  Alert,
  Dialog,
  DialogContent,
  Box,
  Button,
  DialogActions,
  Divider,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import { ImportStatus, KeystoreInfo } from "../../types";
import WaitBox from "../WaitBox/WaitBox";
import { SlideTransition } from "./Transitions";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DialogHeader from "./DialogHeader";
import ValidatorResult from "./ValidatorResult";
import type { Web3signerPostResponse } from "@stakingbrain/brain";

export default function ImportDialog({
  open,
  setOpen,
  keystoresPostResponse,
  keystoresPostError,
  importStatus,
  acceptedFiles
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  keystoresPostResponse: Web3signerPostResponse | undefined;
  keystoresPostError: string | undefined;
  importStatus: string;
  acceptedFiles: KeystoreInfo[];
}): JSX.Element {
  const navigate = useNavigate();
  const isMobile = useMediaQuery(useTheme().breakpoints.down("sm"));
  const handleClose = () => {
    setOpen(false);
    navigate({ pathname: "/", search: window.location.search });
  };

  return (
    <Dialog
      disableEscapeKeyDown={true}
      open={open}
      fullWidth={true}
      fullScreen={isMobile}
      onClose={(event, reason) => {
        if (!reason) {
          handleClose();
        }
      }}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      TransitionComponent={SlideTransition}
    >
      <DialogHeader
        title={
          importStatus === ImportStatus.Importing
            ? "Importing validators"
            : keystoresPostError
              ? "Import failed"
              : "Import results"
        }
        subtitle="Keystore import status for your selected files."
        icon={<UploadFileIcon />}
        count={acceptedFiles.length}
        onClose={handleClose}
        busy={importStatus === ImportStatus.Importing}
      />
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {keystoresPostError ? (
            <Alert severity="error">{keystoresPostError}</Alert>
          ) : keystoresPostResponse ? (
            <div>
              {keystoresPostResponse.data.map((result, index) => (
                <ValidatorResult
                  key={index}
                  pubkey={acceptedFiles[index]?.pubkey}
                  status={result.status}
                  message={result.message}
                />
              ))}
            </div>
          ) : (
            <WaitBox />
          )}
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions>
        <Button
          disabled={importStatus === ImportStatus.Importing}
          onClick={handleClose}
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import type { JSX } from "react";
import { useMemo } from "react";
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
import BatchProgressView from "./BatchProgressView";
import {
  IMPORTED_STATUSES,
  ImportProgress,
  ImportResult,
  IMPORTING,
  retryableIndexes
} from "../../utils/importBatches";

export default function ImportDialog({
  open,
  setOpen,
  results,
  progress,
  error,
  stopped,
  stopRequested,
  importStatus,
  acceptedFiles,
  onStop,
  onRetry
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  results: ImportResult[] | undefined;
  progress: ImportProgress | undefined;
  error: string | undefined;
  stopped: "user" | "error" | undefined;
  stopRequested: boolean;
  importStatus: string;
  acceptedFiles: KeystoreInfo[];
  onStop: () => void;
  onRetry: (indexes: number[]) => void;
}): JSX.Element {
  const navigate = useNavigate();
  const isMobile = useMediaQuery(useTheme().breakpoints.down("sm"));
  const importing = importStatus === ImportStatus.Importing;
  const handleClose = () => {
    setOpen(false);
    navigate({ pathname: "/", search: window.location.search });
  };
  const retry = useMemo(() => retryableIndexes(results ?? []), [results]);

  return (
    <Dialog
      disableEscapeKeyDown={true}
      open={open}
      fullWidth={true}
      fullScreen={isMobile}
      onClose={(event, reason) => {
        if (!reason && !importing) handleClose();
      }}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      TransitionComponent={SlideTransition}
    >
      <DialogHeader
        title={importing ? "Importing validators" : error ? "Import failed" : "Import results"}
        subtitle="Keystore import status for your selected files."
        icon={<UploadFileIcon />}
        count={acceptedFiles.length}
        onClose={handleClose}
        busy={importing}
      />
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : !results || !progress ? (
            <WaitBox />
          ) : (
            <BatchProgressView
              results={results}
              progress={progress}
              running={importing}
              pubkeys={acceptedFiles.map(({ pubkey }) => pubkey)}
              verb="Importing"
              activeStatus={IMPORTING}
              doneStatuses={IMPORTED_STATUSES}
              labels={[
                ["imported", "imported", "success"],
                ["duplicate", "already present", "default"]
              ]}
              runningHint="Decrypting keystores takes time. Keep this window open; you can stop after the current batch."
              stopped={stopped}
              stoppedMessages={{
                error:
                  "The import stopped because a batch failed. Validators not yet imported can be retried; keys that did reach the signer will show as already present.",
                user: "Import stopped. You can retry the validators that were not imported."
              }}
            />
          )}
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions>
        {importing ? (
          <Button onClick={onStop} disabled={stopRequested} sx={{ borderRadius: 2 }}>
            {stopRequested ? "Stopping after this batch…" : "Stop after this batch"}
          </Button>
        ) : (
          retry.length > 0 &&
          !error && (
            <Button onClick={() => onRetry(retry)} sx={{ borderRadius: 2 }}>
              Retry {retry.length} not imported
            </Button>
          )
        )}
        <Button disabled={importing} onClick={handleClose} variant="contained" sx={{ borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

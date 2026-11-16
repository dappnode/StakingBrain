import type { JSX } from "react";
import { useMemo, useState } from "react";
import {
  Alert,
  Dialog,
  DialogContent,
  Box,
  Button,
  Chip,
  DialogActions,
  Divider,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Typography,
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
import {
  ImportProgress,
  ImportResult,
  NOT_ATTEMPTED,
  retryableIndexes,
  summarizeImport
} from "../../utils/importBatches";

// Rendering hundreds of result cards at once makes the dialog sluggish; reveal more on demand.
const RESULTS_PAGE = 100;

const summaryLabels: [status: string, label: string, color: "success" | "default" | "error"][] = [
  ["imported", "imported", "success"],
  ["duplicate", "already present", "default"],
  ["error", "failed", "error"],
  [NOT_ATTEMPTED, "not attempted", "default"]
];

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
  const [onlyProblems, setOnlyProblems] = useState(true);
  const [visible, setVisible] = useState(RESULTS_PAGE);
  const handleClose = () => {
    setOpen(false);
    navigate({ pathname: "/", search: window.location.search });
  };

  const summary = useMemo(() => summarizeImport(results ?? []), [results]);
  const retry = useMemo(() => retryableIndexes(results ?? []), [results]);
  const problems = (summary.error ?? 0) + (summary[NOT_ATTEMPTED] ?? 0);
  // While importing, untouched rows would only be noise; afterwards show problems first when there are any.
  const filtering = (results?.length ?? 0) > 10 && onlyProblems && (problems > 0 || importing);
  const shown = (results ?? [])
    .map((result, index) => ({ result, index }))
    .filter(({ result }) =>
      filtering ? (importing ? result.status === "error" : !["imported", "duplicate"].includes(result.status)) : true
    );

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
            <Stack spacing={2}>
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {progress.done} of {progress.total} validators processed
                  </Typography>
                  {progress.batches > 1 && (
                    <Typography variant="body2" color="text.secondary">
                      Batch {Math.min(progress.batch + (importing ? 1 : 0), progress.batches)} of {progress.batches}
                    </Typography>
                  )}
                </Stack>
                <LinearProgress
                  variant={importing && progress.done === 0 ? "indeterminate" : "determinate"}
                  value={progress.total ? (progress.done / progress.total) * 100 : 0}
                  aria-label="Import progress"
                />
                {importing && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Decrypting keystores takes time. Keep this window open; you can stop after the current batch.
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {summaryLabels
                  .filter(([status]) => summary[status])
                  .map(([status, label, color]) => (
                    <Chip
                      key={status}
                      size="small"
                      variant="outlined"
                      color={color}
                      label={`${summary[status]} ${label}`}
                    />
                  ))}
              </Stack>

              {stopped === "error" && (
                <Alert severity="warning">
                  The import stopped because a batch failed. Validators not yet imported can be retried; keys that did
                  reach the signer will show as already present.
                </Alert>
              )}
              {stopped === "user" && (
                <Alert severity="info">Import stopped. You can retry the validators that were not imported.</Alert>
              )}

              {results.length > 10 && (problems > 0 || importing) && (
                <FormControlLabel
                  control={<Switch checked={onlyProblems} onChange={(_, checked) => setOnlyProblems(checked)} />}
                  label="Show only problems"
                />
              )}

              <div>
                {shown.slice(0, visible).map(({ result, index }) => (
                  <ValidatorResult
                    key={acceptedFiles[index]?.pubkey ?? index}
                    pubkey={acceptedFiles[index]?.pubkey}
                    status={result.status}
                    message={result.message}
                  />
                ))}
                {shown.length > visible && (
                  <Button size="small" onClick={() => setVisible(visible + RESULTS_PAGE)}>
                    Show {Math.min(RESULTS_PAGE, shown.length - visible)} more of {shown.length - visible}
                  </Button>
                )}
              </div>
            </Stack>
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

import type { JSX } from "react";
import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Button,
  DialogContentText,
  DialogActions,
  Alert,
  Divider,
  Stack
} from "@mui/material";
import type { GridRowId } from "@mui/x-data-grid";
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import DeletionWarning from "./DeletionWarning";
import { rpcClient } from "../../socket";
import { SlideTransition } from "./Transitions";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DialogHeader from "./DialogHeader";
import BatchProgressView from "./BatchProgressView";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";
import { useTheme, useMediaQuery } from "@mui/material";
import { BatchProgress, BatchResult, notAttempted } from "../../utils/batchRunner";
import {
  DELETED_STATUSES,
  DELETING,
  mergeInterchanges,
  planDeleteBatches,
  retryableDeletes,
  runDeleteBatches
} from "../../utils/deleteBatches";

export default function KeystoresDeleteDialog({
  validators,
  setSelectedRows,
  open,
  setOpen
}: {
  /** The selected validators, resolved by pubkey. */
  validators: CustomValidatorGetResponse[];
  setSelectedRows: (selectedRows: GridRowId[]) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}): JSX.Element {
  // Fixed when deletion starts, so later list refreshes cannot change what is being deleted.
  const [targets, setTargets] = useState<string[]>();
  const [results, setResults] = useState<BatchResult[]>();
  const [progress, setProgress] = useState<BatchProgress>();
  const [stopped, setStopped] = useState<"user" | "error">();
  const [running, setRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const stopRef = useRef(false);
  // Every batch exports the slashing history of its keys; keep all of it, across retries too.
  const [exports, setExports] = useState<string[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  async function deleteKeystores(pubkeys: string[], only?: number[]) {
    setTargets(pubkeys);
    setRunning(true);
    setStopped(undefined);
    stopRef.current = false;
    setStopRequested(false);
    const outcome = await runDeleteBatches({
      batches: planDeleteBatches(pubkeys, only),
      results: (only && results) || pubkeys.map(notAttempted),
      deleteBatch: (request) => rpcClient.call("deleteValidators", request),
      onProgress: (update, latest) => {
        setProgress(update);
        setResults(latest);
      },
      shouldStop: () => stopRef.current
    });
    setResults(outcome.results);
    setStopped(outcome.stopped);
    setExports((previous) => [...previous, ...outcome.slashingProtection]);
    setRunning(false);
    setSelectedRows([]);
  }

  const retry = useMemo(() => retryableDeletes(results ?? []), [results]);
  const downloads = useMemo(() => mergeInterchanges(exports), [exports]);
  const handleClose = () => setOpen(false);

  return (
    <Dialog
      disableEscapeKeyDown={true}
      open={open}
      fullScreen={isMobile}
      fullWidth={!isMobile}
      onClose={(event, reason) => {
        if (!reason && !running) handleClose();
      }}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      TransitionComponent={SlideTransition}
    >
      <DialogHeader
        title={running ? "Deleting keystores" : targets ? "Deletion results" : "Delete keystores"}
        subtitle="Remove validator keys from this signer."
        icon={<DeleteOutlineIcon />}
        count={targets?.length ?? validators.length}
        onClose={handleClose}
        busy={running}
      />
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {targets && results && progress ? (
            <Stack spacing={2}>
              <BatchProgressView
                results={results}
                progress={progress}
                running={running}
                pubkeys={targets}
                verb="Deleting"
                activeStatus={DELETING}
                doneStatuses={DELETED_STATUSES}
                labels={[
                  ["deleted", "deleted", "success"],
                  ["not_active", "deleted (inactive)", "success"],
                  ["not_found", "not in signer", "default"]
                ]}
                runningHint="Keep this window open; you can stop after the current batch."
                stopped={stopped}
                stoppedMessages={{
                  error:
                    "Deletion stopped because a batch failed. Validators not yet deleted can be retried; keys already removed will show as not in signer.",
                  user: "Deletion stopped. You can retry the validators that were not deleted."
                }}
              />
              {!running && downloads.length > 0 && (
                <div>
                  <Alert severity="warning" sx={{ marginBottom: 2 }}>
                    Keep the slashing protection data for when you import these keystores elsewhere. It is strongly
                    recommended to stop the validator and watch at least 3 missed attestations in the explorer before
                    uploading the keys to another machine.
                  </Alert>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {downloads.map((interchange, index) => (
                      <Button
                        key={index}
                        variant="contained"
                        href={`data:text/json;charset=utf-8,${encodeURIComponent(interchange)}`}
                        download={
                          downloads.length > 1 ? `slashing_protection-${index + 1}.json` : "slashing_protection.json"
                        }
                        sx={{ borderRadius: 2 }}
                      >
                        {downloads.length > 1
                          ? `Download slashing protection (${index + 1})`
                          : "Download slashing protection"}
                      </Button>
                    ))}
                  </Stack>
                </div>
              )}
            </Stack>
          ) : (
            <DialogContentText id="alert-dialog-description" component={"span"}>
              <DeletionWarning validators={validators} />
            </DialogContentText>
          )}
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions>
        {running ? (
          <Button
            onClick={() => {
              stopRef.current = true;
              setStopRequested(true);
            }}
            disabled={stopRequested}
          >
            {stopRequested ? "Stopping after this batch…" : "Stop after this batch"}
          </Button>
        ) : (
          targets &&
          retry.length > 0 && (
            <Button onClick={() => deleteKeystores(targets, retry)}>Retry {retry.length} not deleted</Button>
          )
        )}
        <Button disabled={running} onClick={handleClose}>
          Close
        </Button>
        {!targets && (
          <Button
            onClick={() => deleteKeystores(validators.map(({ pubkey }) => pubkey))}
            variant="contained"
            color="error"
            sx={{ marginRight: 1, borderRadius: 2 }}
          >
            Delete
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

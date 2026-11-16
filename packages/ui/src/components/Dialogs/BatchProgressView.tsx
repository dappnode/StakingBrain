import type { JSX } from "react";
import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Typography
} from "@mui/material";
import ValidatorResult from "./ValidatorResult";
import { BatchProgress, BatchResult, NOT_ATTEMPTED, QUEUED, summarize } from "../../utils/batchRunner";

// Rendering hundreds of result cards at once makes the dialog sluggish; reveal more on demand.
const RESULTS_PAGE = 100;

export type SummaryLabel = [status: string, label: string, color: "success" | "default" | "error" | "info"];

/** Progress and per-validator results of a batched operation (import, delete). */
export default function BatchProgressView({
  results,
  progress,
  running,
  pubkeys,
  verb,
  activeStatus,
  doneStatuses,
  labels,
  runningHint,
  stopped,
  stoppedMessages
}: {
  results: BatchResult[];
  progress: BatchProgress;
  running: boolean;
  /** Pubkey for each result, by position. */
  pubkeys: readonly string[];
  /** e.g. "Importing", for "Importing batch 3 of 15…". */
  verb: string;
  activeStatus: string;
  /** Outcomes that are not problems. */
  doneStatuses: readonly string[];
  /** Summary chips for the operation's own outcomes; failure, in-flight, queued and not attempted are added. */
  labels: SummaryLabel[];
  runningHint?: string;
  stopped?: "user" | "error";
  stoppedMessages: { user: string; error: string };
}): JSX.Element {
  const [onlyProblems, setOnlyProblems] = useState(true);
  const [visible, setVisible] = useState(RESULTS_PAGE);
  const summary = useMemo(() => summarize(results), [results]);
  const allLabels: SummaryLabel[] = [
    ...labels,
    ["error", "failed", "error"],
    [activeStatus, `${verb.toLowerCase()} now`, "info"],
    [QUEUED, "queued", "default"],
    [NOT_ATTEMPTED, "not attempted", "default"]
  ];
  const problems = (summary.error ?? 0) + (summary[NOT_ATTEMPTED] ?? 0);
  // While running, show the batch in flight and failures (queued rows are noise); afterwards, problems.
  const filtering = results.length > 10 && onlyProblems && (problems > 0 || running);
  const shown = results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) =>
      filtering
        ? running
          ? [activeStatus, "error"].includes(result.status)
          : !doneStatuses.includes(result.status)
        : true
    );

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {progress.done} of {progress.total} validators processed
          </Typography>
          {running && progress.current > 0 ? (
            <Stack direction="row" alignItems="center" spacing={1} role="status">
              <CircularProgress size={14} aria-hidden />
              <Typography variant="body2" color="text.secondary">
                {progress.batches > 1
                  ? `${verb} batch ${progress.batch + 1} of ${progress.batches}…`
                  : `${verb} ${progress.current} validators…`}
              </Typography>
            </Stack>
          ) : (
            progress.batches > 1 && (
              <Typography variant="body2" color="text.secondary">
                {progress.batch} of {progress.batches} batches done
              </Typography>
            )
          )}
        </Stack>
        {/* The buffer shows the batch in flight, so the bar moves while a long batch runs. */}
        <LinearProgress
          variant={running ? "buffer" : "determinate"}
          value={progress.total ? (progress.done / progress.total) * 100 : 0}
          valueBuffer={progress.total ? ((progress.done + progress.current) / progress.total) * 100 : 0}
          aria-label={`${verb} progress`}
        />
        {running && runningHint && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {runningHint}
          </Typography>
        )}
      </Box>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {allLabels
          .filter(([status]) => summary[status])
          .map(([status, label, color]) => (
            <Chip key={status} size="small" variant="outlined" color={color} label={`${summary[status]} ${label}`} />
          ))}
      </Stack>

      {stopped === "error" && <Alert severity="warning">{stoppedMessages.error}</Alert>}
      {stopped === "user" && <Alert severity="info">{stoppedMessages.user}</Alert>}

      {results.length > 10 && (problems > 0 || running) && (
        <FormControlLabel
          control={<Switch checked={onlyProblems} onChange={(_, checked) => setOnlyProblems(checked)} />}
          label="Show only problems"
        />
      )}

      <div>
        {shown.slice(0, visible).map(({ result, index }) => (
          <ValidatorResult
            key={pubkeys[index] ?? index}
            pubkey={pubkeys[index]}
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
  );
}

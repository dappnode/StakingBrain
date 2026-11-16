import type { JSX } from "react";
import KeystoresDataGrid from "./KeystoresDataGrid";
import KeystoresDeleteDialog from "../Dialogs/KeystoresDeleteDialog";
import EditFeesDialog from "../Dialogs/EditFeesDialog";
import BuilderConfigDialog from "../Dialogs/BuilderConfigDialog";
import { Alert, Box, Button, CircularProgress, LinearProgress, Typography } from "@mui/material";
import type { GridRowId } from "@mui/x-data-grid";
import { featureFlags, StakerConfig as StakerConfigType, VALIDATORS_CHANGED_EVENT } from "@stakingbrain/common";
import { useEffect, useRef, useState } from "react";
import { BeaconchaUrlBuildingStatus } from "../../types";
import { rpcClient } from "../../socket";
import StakerConfig from "../StakerConfig/StakerConfig";
import KeystoresExitDialog from "../Dialogs/KeystoresExitDialog";
import { getSmoothAddressByNetwork } from "../../utils/addresses";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";
import PageLayout from "../Layout/PageLayout";
import {
  countPending,
  MAX_STALLED_REFRESHES,
  nextStallCount,
  PENDING_REFRESH_MS,
  selectionAfterRefresh
} from "../../utils/validatorRefresh";

export default function ValidatorList({
  stakerConfig,
  userMode
}: {
  stakerConfig: StakerConfigType;
  userMode: "basic" | "advanced";
}): JSX.Element {
  const [selectedRows, setSelectedRows] = useState<GridRowId[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editFeesOpen, setEditFeesOpen] = useState(false);
  const [builderConfigOpen, setBuilderConfigOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatorsGet, setValidatorsGet] = useState<CustomValidatorGetResponse[]>();
  const [validatorsGetError, setValidatorsGetError] = useState<string>();
  const [summaryUrlBuildingStatus, setSummaryUrlBuildingStatus] = useState(BeaconchaUrlBuildingStatus.NotStarted);

  const { network, isMevBoostSet } = stakerConfig;
  const smoothAddress = getSmoothAddressByNetwork(network);
  const anyDialogOpen = deleteOpen || editFeesOpen || exitOpen || builderConfigOpen;
  const dialogOpenRef = useRef(anyDialogOpen);
  dialogOpenRef.current = anyDialogOpen;
  const rowsRef = useRef<CustomValidatorGetResponse[]>(undefined);
  const inFlight = useRef(false);
  const queued = useRef(false);
  const stalls = useRef(0);
  const lastPending = useRef<number>(undefined);
  const [stalled, setStalled] = useState(false);

  // Re-render table after delete/update validators
  useEffect(() => {
    if (!anyDialogOpen) {
      // Only the first load blanks the page; later refreshes keep the table visible.
      getValidators(rowsRef.current !== undefined);
      setSelectedRows([]);
    }
  }, [anyDialogOpen]);

  // Live updates: the Brain pushes a hint after every validator change, from any tab or the reload job.
  // Dialogs act on row positions, so refreshes wait until they close (closing always refreshes).
  useEffect(() => {
    const refresh = () => {
      if (!dialogOpenRef.current) void getValidators(true);
    };
    const offChanged = rpcClient.on(VALIDATORS_CHANGED_EVENT, refresh);
    // Catch up on hints missed while disconnected.
    const offConnect = rpcClient.on("connect", refresh);
    return () => {
      offChanged();
      offConnect();
    };
  }, []);

  // Large lists load in bounded rounds; keep refreshing while rows are pending and progress is made.
  useEffect(() => {
    if (anyDialogOpen || stalled || !validatorsGet || countPending(validatorsGet) === 0) return;
    const timer = setTimeout(() => getValidators(true), PENDING_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [validatorsGet, anyDialogOpen, stalled]);

  async function getValidators(background = false) {
    // Coalesce overlapping triggers into one follow-up refresh.
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    try {
      if (!background) setLoading(true);
      const rows = await rpcClient.call("getValidators", undefined);
      // Capture the rows the current selection refers to before replacing them (see selectionAfterRefresh).
      if (background) setSelectedRows(selectionAfterRefresh(rowsRef.current, rows));
      rowsRef.current = rows;
      const pending = countPending(rows);
      stalls.current = nextStallCount(stalls.current, lastPending.current, pending);
      lastPending.current = pending;
      setStalled(stalls.current >= MAX_STALLED_REFRESHES);
      setValidatorsGet(rows);
      setValidatorsGetError(undefined);
    } catch (e) {
      console.error(e);
      // A failed background refresh keeps the last good table instead of replacing it with an error.
      if (!background || !rowsRef.current) setValidatorsGetError(e.message);
    } finally {
      if (!background) setLoading(false);
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        if (!dialogOpenRef.current) void getValidators(true);
      }
    }
  }

  const pendingCount = validatorsGet ? countPending(validatorsGet) : 0;

  const SmoothBanner = () => {
    return (
      <Box>
        <Alert severity="info" variant="outlined">
          Join Smooth by selecting your validators and editing their fee recipient. Learn more{" "}
          <strong>
            <a href="https://smooth.dappnode.io/" target="_blank" rel="noopener noreferrer">
              here!
            </a>
          </strong>
        </Alert>
      </Box>
    );
  };

  return (
    <PageLayout>
      {userMode === "advanced" && <StakerConfig stakerConfig={stakerConfig} />}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3
        }}
      >
        {(network === "hoodi" || network === "mainnet") && <SmoothBanner />}

        <Box sx={{ flexGrow: 1 }}>
          {validatorsGetError ? (
            <Alert severity="error">{validatorsGetError}</Alert>
          ) : loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                minHeight: 320,
                alignItems: "center"
              }}
            >
              <CircularProgress
                sx={{
                  marginBottom: 4
                }}
              />
            </Box>
          ) : validatorsGet ? (
            <>
              {pendingCount > 0 &&
                (stalled ? (
                  <Alert
                    severity="info"
                    sx={{ mb: 2 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                          stalls.current = 0;
                          lastPending.current = undefined;
                          setStalled(false);
                          void getValidators(true);
                        }}
                      >
                        Retry
                      </Button>
                    }
                  >
                    Details for {pendingCount} of {validatorsGet.length} validators are still loading slowly. Your
                    consensus or validator client may be busy or syncing.
                  </Alert>
                ) : (
                  <Box sx={{ mb: 2 }} role="status">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Loading details for {pendingCount} of {validatorsGet.length} validators…
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={((validatorsGet.length - pendingCount) / validatorsGet.length) * 100}
                      aria-label="Validator details loading progress"
                    />
                  </Box>
                ))}
              <KeystoresDataGrid
                rows={validatorsGet}
                areRowsSelected={selectedRows.length !== 0}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                network={network}
                userMode={userMode}
                setDeleteOpen={setDeleteOpen}
                setEditFeesOpen={setEditFeesOpen}
                setBuilderConfigOpen={setBuilderConfigOpen}
                setExitOpen={setExitOpen}
                setSummaryUrlBuildingStatus={setSummaryUrlBuildingStatus}
                mevSpFeeRecipient={smoothAddress}
              />

              {summaryUrlBuildingStatus === BeaconchaUrlBuildingStatus.Error && (
                <Alert severity="warning" sx={{ marginTop: 2 }}>
                  There is no explorer dashboard configured for this network.
                </Alert>
              )}

              {summaryUrlBuildingStatus === BeaconchaUrlBuildingStatus.NoIndexes && (
                <Alert severity="warning" sx={{ marginTop: 2 }}>
                  The dashboard could not be opened because some selected validators do not have an index yet. Check
                  that your consensus client is synced and the validators have been deposited, then refresh the page.
                </Alert>
              )}

              {deleteOpen && (
                <KeystoresDeleteDialog
                  rows={validatorsGet}
                  selectedRows={selectedRows}
                  setSelectedRows={setSelectedRows}
                  open={deleteOpen}
                  setOpen={setDeleteOpen}
                />
              )}

              {editFeesOpen && (
                <EditFeesDialog
                  rows={validatorsGet}
                  selectedRows={selectedRows}
                  open={editFeesOpen}
                  setOpen={setEditFeesOpen}
                  network={network}
                  isMevBoostSet={isMevBoostSet}
                />
              )}

              {featureFlags.builderConfig && builderConfigOpen && (
                <BuilderConfigDialog
                  network={network}
                  validators={selectedRows.map((row) => validatorsGet[row as number])}
                  setOpen={setBuilderConfigOpen}
                />
              )}

              {exitOpen && (
                <KeystoresExitDialog
                  rows={validatorsGet}
                  selectedRows={selectedRows}
                  setSelectedRows={setSelectedRows}
                  open={exitOpen}
                  setOpen={setExitOpen}
                />
              )}
            </>
          ) : (
            <Alert severity="warning">There are no keystores to display.</Alert>
          )}
        </Box>
      </Box>
    </PageLayout>
  );
}

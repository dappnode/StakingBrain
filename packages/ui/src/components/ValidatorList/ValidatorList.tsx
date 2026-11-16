import type { JSX } from "react";
import KeystoresDataGrid from "./KeystoresDataGrid";
import KeystoresDeleteDialog from "../Dialogs/KeystoresDeleteDialog";
import EditFeesDialog from "../Dialogs/EditFeesDialog";
import BuilderConfigDialog from "../Dialogs/BuilderConfigDialog";
import { Alert, Box, Button, CircularProgress, LinearProgress, Typography } from "@mui/material";
import type { GridRowId } from "@mui/x-data-grid";
import { featureFlags, StakerConfig as StakerConfigType, VALIDATORS_CHANGED_EVENT } from "@stakingbrain/common";
import { useEffect, useMemo, useRef, useState } from "react";
import { BeaconchaUrlBuildingStatus } from "../../types";
import { rpcClient } from "../../socket";
import StakerConfig from "../StakerConfig/StakerConfig";
import KeystoresExitDialog from "../Dialogs/KeystoresExitDialog";
import { getSmoothAddressByNetwork } from "../../utils/addresses";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";
import PageLayout from "../Layout/PageLayout";
import { countUnfinished, FOLLOW_UP_MS, MAX_STALLED_FOLLOW_UPS, nextStallCount } from "../../utils/listFollowUp";

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
  const loaded = useRef(false);
  const inFlight = useRef(false);
  const queued = useRef(false);
  const [refreshError, setRefreshError] = useState<string>();
  const stalls = useRef(0);
  const lastUnfinished = useRef<number>(undefined);
  const [stalled, setStalled] = useState(false);

  // Refresh when a dialog closes (its action may have changed validators) and on first load.
  useEffect(() => {
    if (!anyDialogOpen) {
      // Only the first load blanks the page; later refreshes keep the table visible.
      void getValidators(loaded.current);
      setSelectedRows([]);
    }
  }, [anyDialogOpen]);

  // Live updates: the Brain pushes a hint whenever a validator or its client status changes, including
  // when pending checks complete, so the list never needs to poll. Refreshes wait while a dialog is
  // open so its content does not shift; closing a dialog always refreshes.
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

  // Client reads cut off by the Brain's deadline only continue when the list is requested again, so keep
  // requesting (one request at a time) while that makes progress. A failed request does not poll: it
  // shows an error with Retry. Beacon details arrive by push and need no follow-up.
  useEffect(() => {
    if (anyDialogOpen || stalled || refreshError || !validatorsGet || countUnfinished(validatorsGet) === 0) return;
    const timer = setTimeout(() => void getValidators(true), FOLLOW_UP_MS);
    return () => clearTimeout(timer);
  }, [validatorsGet, anyDialogOpen, stalled, refreshError]);

  function retry() {
    stalls.current = 0;
    lastUnfinished.current = undefined;
    setStalled(false);
    setRefreshError(undefined);
    void getValidators(true);
  }

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
      loaded.current = true;
      // Rows are identified by pubkey, so a refresh only has to drop validators that are gone.
      const present = new Set(rows.map(({ pubkey }) => pubkey));
      setSelectedRows((selected) => selected.filter((id) => present.has(String(id))));
      const unfinished = countUnfinished(rows);
      stalls.current = nextStallCount(stalls.current, lastUnfinished.current, unfinished);
      lastUnfinished.current = unfinished;
      setStalled(stalls.current >= MAX_STALLED_FOLLOW_UPS);
      setValidatorsGet(rows);
      setValidatorsGetError(undefined);
      setRefreshError(undefined);
    } catch (e) {
      console.error(e);
      // A failed background refresh keeps the last good table and offers a retry.
      if (!background || !loaded.current) setValidatorsGetError(e.message);
      else setRefreshError(e.message);
    } finally {
      if (!background) setLoading(false);
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        if (!dialogOpenRef.current) void getValidators(true);
      }
    }
  }

  const selectedValidators = useMemo(() => {
    const selected = new Set(selectedRows.map(String));
    return (validatorsGet ?? []).filter(({ pubkey }) => selected.has(pubkey));
  }, [validatorsGet, selectedRows]);
  const pendingCount =
    validatorsGet?.filter(({ detailsPending, beaconPending }) => detailsPending || beaconPending).length ?? 0;
  const detailsErrors = [...new Set((validatorsGet ?? []).flatMap(({ detailsError }) => detailsError ?? []))];

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
              {refreshError && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button color="inherit" size="small" onClick={retry}>
                      Retry
                    </Button>
                  }
                >
                  The validator list could not be refreshed: {refreshError}
                </Alert>
              )}
              {detailsErrors.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Some validator details are unavailable: {detailsErrors.join("; ")}
                </Alert>
              )}
              {stalled && (
                <Alert
                  severity="info"
                  sx={{ mb: 2 }}
                  action={
                    <Button color="inherit" size="small" onClick={retry}>
                      Retry
                    </Button>
                  }
                >
                  Details for {validatorsGet && countUnfinished(validatorsGet)} validators are loading slowly. Your
                  validator client or signer may be busy.
                </Alert>
              )}
              {pendingCount > 0 && (
                <Box sx={{ mb: 2 }} role="status">
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Checking {pendingCount} of {validatorsGet.length} validators with your clients…
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={((validatorsGet.length - pendingCount) / validatorsGet.length) * 100}
                    aria-label="Validator details loading progress"
                  />
                </Box>
              )}
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
                  validators={selectedValidators}
                  setSelectedRows={setSelectedRows}
                  open={deleteOpen}
                  setOpen={setDeleteOpen}
                />
              )}

              {editFeesOpen && (
                <EditFeesDialog
                  validators={selectedValidators}
                  open={editFeesOpen}
                  setOpen={setEditFeesOpen}
                  network={network}
                  isMevBoostSet={isMevBoostSet}
                />
              )}

              {featureFlags.builderConfig && builderConfigOpen && (
                <BuilderConfigDialog network={network} validators={selectedValidators} setOpen={setBuilderConfigOpen} />
              )}

              {exitOpen && (
                <KeystoresExitDialog
                  validators={selectedValidators}
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

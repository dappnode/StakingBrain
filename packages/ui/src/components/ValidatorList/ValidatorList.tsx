import type { JSX } from "react";
import KeystoresDataGrid from "./KeystoresDataGrid";
import KeystoresDeleteDialog from "../Dialogs/KeystoresDeleteDialog";
import EditFeesDialog from "../Dialogs/EditFeesDialog";
import BuilderConfigDialog from "../Dialogs/BuilderConfigDialog";
import { Alert, Box, CircularProgress } from "@mui/material";
import type { GridRowId } from "@mui/x-data-grid";
import { StakerConfig as StakerConfigType } from "@stakingbrain/common";
import { useEffect, useState } from "react";
import { BeaconchaUrlBuildingStatus } from "../../types";
import { rpcClient } from "../../socket";
import StakerConfig from "../StakerConfig/StakerConfig";
import KeystoresExitDialog from "../Dialogs/KeystoresExitDialog";
import { getSmoothAddressByNetwork } from "../../utils/addresses";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";
import PageLayout from "../Layout/PageLayout";

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
  // Re-render table after delete/update validators
  useEffect(() => {
    if (!deleteOpen && !editFeesOpen && !exitOpen && !builderConfigOpen) {
      getValidators();
      setSelectedRows([]);
    }
  }, [deleteOpen, editFeesOpen, exitOpen, builderConfigOpen]);

  async function getValidators() {
    try {
      setLoading(true);
      setValidatorsGet(await rpcClient.call("getValidators", undefined));
      setValidatorsGetError(undefined);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setValidatorsGetError(e.message);
      setLoading(false);
    }
  }

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

              {builderConfigOpen && (
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

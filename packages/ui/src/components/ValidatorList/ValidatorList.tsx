import KeystoresDataGrid from "./KeystoresDataGrid";
import KeystoresDeleteDialog from "../Dialogs/KeystoresDeleteDialog";
import EditFeesDialog from "../Dialogs/EditFeesDialog";
import { Alert, Box, CircularProgress, Card } from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import {
  Network,
  CustomValidatorGetResponse,
  StakerConfig as StakerConfigType,
} from "@stakingbrain/common";
import { useEffect, useState } from "react";
import { BeaconchaUrlBuildingStatus } from "../../types";
import { api } from "../../api";
import StakerConfig from "../StakerConfig/StakerConfig";
import KeystoresExitDialog from "../Dialogs/KeystoresExitDialog";
import { getSmoothAddressByNetwork } from "../../utils/addresses";

export default function ValidatorList({
  stakerConfig,
  userMode,
}: {
  stakerConfig: StakerConfigType<Network>;
  userMode: "basic" | "advanced";
}): JSX.Element {
  const [selectedRows, setSelectedRows] = useState<GridSelectionModel>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editFeesOpen, setEditFeesOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatorsGet, setValidatorsGet] =
    useState<CustomValidatorGetResponse[]>();
  const [validatorsGetError, setValidatorsGetError] = useState<string>();
  const [summaryUrlBuildingStatus, setSummaryUrlBuildingStatus] = useState(
    BeaconchaUrlBuildingStatus.NotStarted
  );

  const { network, isMevBoostSet } = stakerConfig
  const smoothAddress = getSmoothAddressByNetwork(network);
  useEffect(() => {
    getValidators();
  }, []);

  // Re-render table after delete/update validators
  useEffect(() => {
    if (!deleteOpen && !editFeesOpen && !exitOpen) {
      getValidators();
      setSelectedRows([]);
    }
  }, [deleteOpen, editFeesOpen, exitOpen]);

  async function getValidators() {
    try {
      setLoading(true);
      setValidatorsGet(await api.getValidators());
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
      <Box sx={{ marginBottom: 3 }}>
        <Alert severity="info" variant="filled">
          🎉 Calling all solo stakers: Smooth has arrived! To join, select your validators and click on the edit fee recipient button.  Learn more{" "}
          <strong><a href="https://smooth.dappnode.io/" target="_blank" rel="noopener noreferrer">here!</a></strong>
        </Alert>
      </Box>
    );
  };
  

  return (
    <div>
      {userMode === "advanced" && <StakerConfig stakerConfig={stakerConfig} />}
      <Box
        sx={{
          margin: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "left",
        }}
      >
        {(network === "prater" || network === "mainnet") && <SmoothBanner />}

        <Card
          sx={{
            padding: 4,
            borderRadius: 2,
          }}
        >
          {validatorsGetError ? (
            <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
              {validatorsGetError}
            </Alert>
          ) : loading ? (
            <CircularProgress
              sx={{
                marginBottom: 4,
              }}
            />
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
                setExitOpen={setExitOpen}
                summaryUrlBuildingStatus={summaryUrlBuildingStatus}
                setSummaryUrlBuildingStatus={setSummaryUrlBuildingStatus}
                mevSpFeeRecipient={smoothAddress}
              />

              {summaryUrlBuildingStatus ===
                BeaconchaUrlBuildingStatus.Error && (
                <Alert
                  severity="warning"
                  sx={{ marginTop: 2 }}
                  variant="filled"
                >
                  There was an error loading the dashboard. The number of API
                  calls allowed by the explorer might have been exceeded or the
                  network might be invalid. Please wait for a minute and refresh
                  the page.
                </Alert>
              )}

              {summaryUrlBuildingStatus ===
                BeaconchaUrlBuildingStatus.NoIndexes && (
                <Alert
                  severity="warning"
                  sx={{ marginTop: 2 }}
                  variant="filled"
                >
                  There was an error loading the dashboard. The explorer may not
                  be able to show a dashboard for all your validators or some of
                  them might not have been indexed yet. Have you done a deposit?
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
            <Alert severity="warning" sx={{ marginTop: 2 }} variant="filled">
              There are no keystores to display.
            </Alert>
          )}
        </Card>
      </Box>
    </div>
  );
}

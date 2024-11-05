import KeystoresDataGrid from "./KeystoresDataGrid";
import KeystoresDeleteDialog from "../Dialogs/KeystoresDeleteDialog";
import EditFeesDialog from "../Dialogs/EditFeesDialog";
import { Alert, Box, CircularProgress, Card } from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import { StakerConfig as StakerConfigType } from "@stakingbrain/common";
import { useEffect, useState } from "react";
import { BeaconchaUrlBuildingStatus } from "../../types";
import { rpcClient } from "../../socket";
import StakerConfig from "../StakerConfig/StakerConfig";
import KeystoresExitDialog from "../Dialogs/KeystoresExitDialog";
import { getSmoothAddressByNetwork } from "../../utils/addresses";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";
import DeleteDialog from "../Dialogs/DeleteDialog";

export default function ValidatorList({
  stakerConfig,
  userMode,
}: {
  stakerConfig: StakerConfigType;
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
    BeaconchaUrlBuildingStatus.NotStarted,
  );

  const { network, isMevBoostSet } = stakerConfig;
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
      <Box sx={{ marginBottom: 3 }}>
        <Alert severity="info" variant="filled">
          🎉 Calling all solo stakers: Smooth has arrived! To join, select your
          validators and click on the edit fee recipient button. Learn more{" "}
          <strong>
            <a
              href="https://smooth.dappnode.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              here!
            </a>
          </strong>
        </Alert>
      </Box>
    );
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center">
      {userMode === "advanced" && <StakerConfig stakerConfig={stakerConfig} />}
      {(network === "prater" || network === "mainnet") && <SmoothBanner />}
      {validatorsGetError ? (
        <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
          {validatorsGetError}
        </Alert>
      ) : loading ? (
        <CircularProgress
          sx={{
            color: "#9333ea",
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

          {summaryUrlBuildingStatus === BeaconchaUrlBuildingStatus.Error && (
            <Alert severity="warning" sx={{ marginTop: 2 }} variant="filled">
              There was an error loading the dashboard. The number of API calls
              allowed by the explorer might have been exceeded or the network
              might be invalid. Please wait for a minute and refresh the page.
            </Alert>
          )}

          {summaryUrlBuildingStatus ===
            BeaconchaUrlBuildingStatus.NoIndexes && (
            <Alert severity="warning" sx={{ marginTop: 2 }} variant="filled">
              There was an error loading the dashboard. The explorer may not be
              able to show a dashboard for all your validators or some of them
              might not have been indexed yet. Have you done a deposit?
            </Alert>
          )}

          <DeleteDialog
            rows={validatorsGet}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            isOpen={deleteOpen}
            setIsOpen={setDeleteOpen}
          />
{/* 
          {deleteOpen && (
            <KeystoresDeleteDialog
              rows={validatorsGet}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              open={deleteOpen}
              setOpen={setDeleteOpen}
            />
          )} */}

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
    </div>
  );
}

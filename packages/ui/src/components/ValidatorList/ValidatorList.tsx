import KeystoreList from "../KeystoreList/KeystoreList";
import KeystoresDeleteDialog from "../Dialogs/KeystoresDeleteDialog";
import EditFeesDialog from "../Dialogs/EditFeesDialog";
import { Alert, Box, CircularProgress } from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import { Network, CustomValidatorGetResponse } from "@stakingbrain/common";
import { useEffect, useState } from "react";
import buildValidatorSummaryURL from "../../logic/Utils/buildValidatorSummaryURL";
import { beaconchaApiParamsMap } from "../../params";
import { BeaconchaUrlBuildingStatus } from "../../types";
import { api } from "../../api";
import { boxStyle } from "../../Styles/listStyles";
import { hasIndexes } from "../../logic/Utils/beaconchaUtils";

export default function ValidatorList({
  network,
  userMode,
}: {
  network: Network;
  userMode: "basic" | "advanced";
}): JSX.Element {
  const [selectedRows, setSelectedRows] = useState<GridSelectionModel>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editFeesOpen, setEditFeesOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatorSummaryURL, setValidatorSummaryURL] = useState<string>("");
  const [summaryUrlBuildingStatus, setSummaryUrlBuildingStatus] = useState(
    BeaconchaUrlBuildingStatus.NotStarted
  );
  const [validatorsGet, setValidatorsGet] =
    useState<CustomValidatorGetResponse[]>();
  const [validatorsGetError, setValidatorsGetError] = useState<string>();

  // Use effect on timer to refresh the list of validators
  useEffect(() => {
    getValidators();
    const interval = setInterval(() => {
      getValidators();
    }, 60 * 3 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Use effect to reset the validator on delete
  useEffect(() => {
    if (!deleteOpen) getValidators();
  }, [deleteOpen]);

  useEffect(() => {
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NotStarted);
    setValidatorSummaryURL("");
  }, [validatorsGet]);

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

  async function getValidatorSummaryURL() {
    if (!validatorsGet) {
      setValidatorSummaryURL("");
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Error);
      return;
    }

    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.InProgress);

    const allValidatorsInfo = await api.beaconchaFetchAllValidatorsInfo(
      validatorsGet.map((keystore) => keystore.pubkey)
    );

    try {
      const validatorSummaryURL = buildValidatorSummaryURL({
        allValidatorsInfo,
        network,
      });

      if (hasIndexes(validatorSummaryURL)) {
        setValidatorSummaryURL("");
        setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NoIndexes);
      } else {
        setValidatorSummaryURL(validatorSummaryURL);
        setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Success);
      }
    } catch (e) {
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Error);
      setValidatorSummaryURL("");
      console.log(e);
    }
  }

  async function loadSummaryUrl() {
    if (validatorsGet && beaconchaApiParamsMap.has(network)) {
      const beaconchaParams = beaconchaApiParamsMap.get(network);
      if (beaconchaParams) getValidatorSummaryURL();
    }
  }

  return (
    <div>
      <Box className="box" sx={boxStyle}>
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
            <KeystoreList
              rows={validatorsGet}
              areRowsSelected={selectedRows.length !== 0}
              setSelectedRows={setSelectedRows}
              network={network}
              userMode={userMode}
              setDeleteOpen={setDeleteOpen}
              setEditFeesOpen={setEditFeesOpen}
              isTableEmpty={validatorsGet.length === 0}
              validatorSummaryURL={validatorSummaryURL}
              summaryUrlBuildingStatus={summaryUrlBuildingStatus}
              loadSummaryUrl={loadSummaryUrl}
            />

            {summaryUrlBuildingStatus === BeaconchaUrlBuildingStatus.Error && (
              <Alert severity="warning" sx={{ marginTop: 2 }} variant="filled">
                There was an error loading the dashboard. The number of API
                calls allowed by the explorer might have been exceeded or the
                network might be invalid. Please wait for a minute and refresh
                the page.
              </Alert>
            )}

            {summaryUrlBuildingStatus ===
              BeaconchaUrlBuildingStatus.NoIndexes && (
              <Alert severity="warning" sx={{ marginTop: 2 }} variant="filled">
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
              />
            )}
          </>
        ) : (
          <Alert severity="warning" sx={{ marginTop: 2 }} variant="filled">
            There are no keystores to display.
          </Alert>
        )}
      </Box>
    </div>
  );
}

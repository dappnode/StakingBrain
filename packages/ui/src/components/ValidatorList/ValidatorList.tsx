//Internal components
import KeystoreList from "../KeystoreList/KeystoreList";
import KeystoresDeleteDialog from "../Dialogs/KeystoresDeleteDialog";
import ButtonsBox from "../ButtonsBox/ButtonsBox";
import EditFeesDialog from "../Dialogs/EditFeesDialog";

//External components
import { Alert, Box, Card, CircularProgress } from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";

//Logic
import { Network, CustomValidatorGetResponse } from "@stakingbrain/common";
import { useEffect, useState } from "react";
import buildValidatorSummaryURL from "../../logic/Utils/buildValidatorSummaryURL";
import { beaconchaApiParamsMap } from "../../params";
import { BeaconchaUrlBuildingStatus } from "../../types";
import { api } from "../../api";

//Styles
import { boxStyle } from "../../Styles/listStyles";
import { HeaderTypography } from "../../Styles/Typographies";
import { hasIndexes } from "../../logic/Utils/beaconchaUtils";

export default function ValidatorList({
  network,
  validatorsGet,
  validatorsGetLoading,
  validatorsGetError,
}: {
  network: Network;
  validatorsGet: CustomValidatorGetResponse[];
  validatorsGetLoading: boolean;
  validatorsGetError?: string;
}): JSX.Element {
  const [selectedRows, setSelectedRows] = useState<GridSelectionModel>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editFeesOpen, setEditFeesOpen] = useState(false);
  const [validatorSummaryURL, setValidatorSummaryURL] = useState<string>("");
  const [summaryUrlBuildingStatus, setSummaryUrlBuildingStatus] = useState(
    BeaconchaUrlBuildingStatus.NotStarted
  );

  useEffect(() => {
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NotStarted);
    setValidatorSummaryURL("");
  }, [validatorsGet]);

  async function getValidatorSummaryURL() {
    if (!validatorsGet) {
      setValidatorSummaryURL("");
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Error);
      return;
    }

    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.InProgress);

    const allValidatorsInfo = await api.beaconchaFetchAllValidatorsInfo(
      validatorsGet.map((keystore) => keystore.validating_pubkey)
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
    if (validatorsGet.length > 0 && beaconchaApiParamsMap.has(network)) {
      const beaconchaParams = beaconchaApiParamsMap.get(network);
      if (beaconchaParams) getValidatorSummaryURL();
    }
  }

  return (
    <div>
      <Box className="box" sx={boxStyle}>
        <Card sx={{ padding: 4, borderRadius: 5 }}>
          <HeaderTypography
            sx={{ flexGrow: 1, fontWeight: "bold", marginBottom: 2 }}
            text="Your validator accounts"
          />

          {validatorsGetError ? (
            <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
              {validatorsGetError}
            </Alert>
          ) : validatorsGetLoading ? (
            <CircularProgress
              sx={{
                marginBottom: 4,
              }}
            />
          ) : validatorsGet ? (
            <>
              <KeystoreList
                rows={validatorsGet}
                setSelectedRows={setSelectedRows}
                network={network}
              />
              <ButtonsBox
                areRowsSelected={selectedRows.length !== 0}
                isTableEmpty={validatorsGet.length === 0}
                setDeleteOpen={setDeleteOpen}
                setEditFeesOpen={setEditFeesOpen}
                validatorSummaryURL={validatorSummaryURL}
                summaryUrlBuildingStatus={summaryUrlBuildingStatus}
                loadSummaryUrl={loadSummaryUrl}
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

//Internal components
import KeystoreList from "../KeystoreList/KeystoreList";
import KeystoresDeleteDialog from "../Dialogs/KeystoresDeleteDialog";
import ButtonsBox from "../ButtonsBox/ButtonsBox";

//External components
import { Alert, Box, Card, CircularProgress } from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";

//Logic
import { Network, Web3signerGetResponse } from "@stakingbrain/common";
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
}: {
  network: Network;
}): JSX.Element {
  const [selectedRows, setSelectedRows] = useState<GridSelectionModel>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatorSummaryURL, setValidatorSummaryURL] = useState<string>("");
  const [summaryUrlBuildingStatus, setSummaryUrlBuildingStatus] = useState(
    BeaconchaUrlBuildingStatus.NotStarted
  );
  const [keystoresGet, setKeystoresGet] = useState<Web3signerGetResponse>();
  const [keystoresGetError, setKeystoresGetError] = useState<string>();

  async function getKeystores() {
    try {
      setLoading(true);
      setKeystoresGet(await api.getValidators());
      setKeystoresGetError(undefined);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setKeystoresGetError(e.message);
      setLoading(false);
    }
  }

  async function getValidatorSummaryURL() {
    if (!keystoresGet) {
      setValidatorSummaryURL("");
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Error);
      return;
    }

    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.InProgress);

    const allValidatorsInfo = await api.beaconchaFetchAllValidatorsInfo(
      keystoresGet
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

  useEffect(() => {
    if (!open) {
      getKeystores();
    }
  }, [open]);

  useEffect(() => {
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NotStarted);
    setValidatorSummaryURL("");
  }, [keystoresGet]);

  async function loadSummaryUrl() {
    if (keystoresGet && beaconchaApiParamsMap.has(network)) {
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

          {keystoresGetError ? (
            <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
              {keystoresGetError}
            </Alert>
          ) : loading ? (
            <CircularProgress
              sx={{
                marginBottom: 4,
              }}
            />
          ) : keystoresGet?.data ? (
            <>
              <KeystoreList
                rows={keystoresGet.data}
                setSelectedRows={setSelectedRows}
                network={network}
              />
              <ButtonsBox
                areRowsSelected={selectedRows.length !== 0}
                isTableEmpty={keystoresGet.data.length === 0}
                setOpen={setOpen}
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

              {open && (
                <KeystoresDeleteDialog
                  rows={keystoresGet.data}
                  selectedRows={selectedRows}
                  setSelectedRows={setSelectedRows}
                  open={open}
                  setOpen={setOpen}
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

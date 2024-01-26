import { DataGrid, GridAlignment, GridSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { beaconchaApiParamsMap } from "../../params";
import {
  BeaconchaGetResponse,
  CustomValidatorGetResponse,
  SmoothValidatorByIndexApiResponse,
  MevSpSubscriptionStatus,
  MAINNET_ORACLE_URL,
  TESTNET_ORACLE_URL,
} from "@stakingbrain/common";
import SmoothStatus from "./SmoothStatus";
import { GridColDef } from "@mui/x-data-grid";
import LinkIcon from "@mui/icons-material/Link";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpIcon from "@mui/icons-material/Help";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { HeaderTypography } from "../../Styles/Typographies";
import { Box } from "@mui/system";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import { BeaconchaUrlBuildingStatus, SmoothStatusByPubkey } from "../../types";
import { api } from "../../api";
import buildValidatorSummaryURL from "../../utils/buildValidatorSummaryURL";
import LogoutIcon from "@mui/icons-material/Logout";

export default function KeystoresDataGrid({
  rows,
  areRowsSelected,
  selectedRows,
  setSelectedRows,
  network,
  userMode,
  setDeleteOpen,
  setEditFeesOpen,
  setExitOpen,
  summaryUrlBuildingStatus,
  setSummaryUrlBuildingStatus,
  mevSpFeeRecipient,
}: {
  rows: CustomValidatorGetResponse[];
  areRowsSelected: boolean;
  selectedRows: GridSelectionModel;
  setSelectedRows: (selectedRows: GridSelectionModel) => void;
  network: string;
  userMode: "basic" | "advanced";
  setDeleteOpen(open: boolean): void;
  setEditFeesOpen(open: boolean): void;
  setExitOpen(open: boolean): void;
  summaryUrlBuildingStatus: BeaconchaUrlBuildingStatus;
  setSummaryUrlBuildingStatus: (status: BeaconchaUrlBuildingStatus) => void;
  mevSpFeeRecipient: string | null;
}): JSX.Element {
  const [pageSize, setPageSize] = useState(rows.length > 10 ? 10 : rows.length);
  const beaconchaBaseUrl = beaconchaApiParamsMap.get(network)?.baseUrl;
  const [validatorSummaryURL, setValidatorSummaryURL] = useState<string>("");

  useEffect(() => {
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NotStarted);
    setValidatorSummaryURL("");
  }, [selectedRows]);

  useEffect(() => {
    openDashboardTab();
  }, [validatorSummaryURL]);

  const [validatorsSubscriptionMap, setValidatorsSubscriptionMap] =
    useState<SmoothStatusByPubkey | null>(null);

  const [oracleCallError, setOracleCallError] = useState<string>();

  // Check that Smooth API returns an expected response format
  function isValidOracleResponse(
    response: SmoothValidatorByIndexApiResponse
  ): boolean {
    return (
      response &&
      (Array.isArray(response.found_validators) ||
        response.found_validators === null) &&
      (Array.isArray(response.not_found_validators) ||
        response.not_found_validators === null)
    );
  }

  // This function fetches the subscription status of the validators in the rows array
  // It uses the validator index to fetch the status from the Oracle API
  // It updates the validatorsSubscriptionMap state with the new data
  const fetchValidatorsData = async (rows: CustomValidatorGetResponse[]) => {
    const newValidatorSubscriptionStatus: SmoothStatusByPubkey = {};
    // Filter rows to include only those with an index
    const rowsWithIndex = rows.filter((row) => row.index);

    try {
      // Only proceed if there is at least one row with an index
      // new validatos will not have an index yet
      if (rowsWithIndex.length < 1) {
        throw new Error(
          "No validators with index found! Is your consensus client synced? Have you done the deposit recently?"
        );
      }

      const apiUrl =
        network === "mainnet" ? MAINNET_ORACLE_URL : TESTNET_ORACLE_URL;

      const healthCheckResponse = await fetch(`${apiUrl}/status`);
      const healthCheckData = await healthCheckResponse.json();

      if (!healthCheckData.is_oracle_in_sync) {
        throw new Error("Oracle is not in sync. Please try again later.");
      }

      // Initialize an array to hold the batches
      const batches = [];
      // Create a helper array from rowsWithIndex to avoid modifying the original array
      const helperArray = [...rowsWithIndex];

      // Split the indices into batches of 100 or less
      while (helperArray.length) {
        batches.push(helperArray.splice(0, 100));
      }
      for (const batch of batches) {
        // Call the Oracle API to get the subscription status of the validators in the batch by their index
        const oracleApiResponse = await fetch(
          `${apiUrl}/memory/validatorsbyindex/${batch
            .map((row) => row.index)
            .join(",")}`
        );

        // if this happens, the oracle is online and synced but something went wrong
        if (!oracleApiResponse.ok) {
          throw new Error(
            `HTTP error when calling Oracle! Please try again later. ${oracleApiResponse}`
          );
        }

        // If response is ok, parse its json content and sanitize it
        const oracleJsonResponse = await oracleApiResponse.json();
        if (!isValidOracleResponse(oracleJsonResponse)) {
          throw new Error(
            "Unexpected response structure when calling Oracle! Could not fetch validator subscription status"
          );
        }

        // If we get here, we assume everything went well and process the data
        const foundValidators = oracleJsonResponse.found_validators || []; //treat array as empty if undefined to avoid errors
        for (const foundValidator of foundValidators) {
          newValidatorSubscriptionStatus[foundValidator.validator_key] =
            foundValidator.status;
        }
        // process not found validators and mark them as unsubscribed
        const notFoundValidators =
          oracleJsonResponse.not_found_validators || []; //treat array as empty if undefined to avoid errors
        for (const notFoundValidator of notFoundValidators) {
          const notFoundValiToString = notFoundValidator.toString();

          // find the validator in the batch and mark it as not subscribed
          const validator = batch.find(
            (validator) => validator.index === notFoundValiToString
          );
          if (validator) {
            newValidatorSubscriptionStatus[validator.pubkey] =
              MevSpSubscriptionStatus.NOT_SUBSCRIBED;
          }
        }
      }
      //Update the object containing the subscription status by pubkey of all validators
      setValidatorsSubscriptionMap(newValidatorSubscriptionStatus);
      setOracleCallError(undefined);
    } catch (e) {
      setOracleCallError("Error fetching subscription status: " + e.message);
    }
  };

  useEffect(() => {
    if (rows.length > 0) {
      fetchValidatorsData(rows);
    }
  }, [rows]);

  const columns: GridColDef[] = [
    {
      field: "pubkey",
      headerName: "Public Key",
      description: "Validating Public Key",
      disableColumnMenu: true,
      flex: 1,
      headerClassName: "tableHeader",
    },
    {
      field: "feeRecipient",
      headerName: "Fee Recipient",
      description:
        "Address to which the rewards generated from proposing a block are sent",
      disableReorder: true,
      disableColumnMenu: true,
      disableExport: true,
      sortable: false,
      align: "center",
      headerAlign: "center",
      headerClassName: "tableHeader",
      width: 360,
    },
    // Only render Smooth column if mevSpFeeRecipient is not null (mainnet or prater)
    ...(mevSpFeeRecipient != null &&
    (network === "mainnet" || network === "prater")
      ? [
          {
            field: "spSubscription",
            headerName: "Smooth",
            description:
              "Dappnode's Smooth subscription status. Smooth states can take up to 40 minutes to update.",
            disableReorder: true,
            disableColumnMenu: true,
            disableExport: true,
            sortable: false,
            align: "center" as GridAlignment,
            headerAlign: "center" as GridAlignment,
            headerClassName: "tableHeader",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            renderCell: (rowData: { row: any }) => {
              // only render smooth status if tag is "solo"
              if (rowData.row.tag === "solo") {
                return (
                  <SmoothStatus
                    rowData={rowData}
                    subscriptionStatus={
                      validatorsSubscriptionMap
                        ? validatorsSubscriptionMap[rowData.row.pubkey]
                        : null
                    }
                    mevSpFeeRecipient={mevSpFeeRecipient}
                    oracleCallError={oracleCallError}
                  />
                );
              } else {
                return <span>-</span>;
              }
            },
          },
        ]
      : []),
    {
      field: "tag",
      headerName: "Tag",
      description: "Tag related to the fee recipient (Solo, Pool, etc)",
      disableReorder: true,
      disableColumnMenu: true,
      disableExport: true,
      sortable: false,
      align: "center",
      headerAlign: "center",
      headerClassName: "tableHeader",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderCell: (rowData: any) => (
        <Tooltip title={rowData.row.tag} placement="top" arrow>
          <Box
            component="img"
            sx={{
              height: 40,
              width: 40,
              padding: 0,
            }}
            alt={rowData.row.tag}
            src={"/assets/tagIcons/" + rowData.row.tag + ".png"}
          />
        </Tooltip>
      ),
    },
  ];

  const customRows = rows.map((row, index) => ({
    pubkey: row.pubkey,
    beaconcha_url: beaconchaBaseUrl
      ? beaconchaBaseUrl + "/validator/" + row.pubkey
      : "",
    feeRecipient: row.feeRecipient,
    index: row.index,
    tag: row.tag,
    withdrawalCredentials: row.withdrawalCredentials,
    pubkeyInValidator: row.validatorImported,
    pubkeyInSigner: row.signerImported,
    feeRecipientImported: row.validatorFeeRecipientCorrect,
    id: index,
  }));

  if (userMode === "advanced")
    columns.push(
      {
        field: "beaconchaUrl",
        headerName: "URL",
        description: "Beaconcha URL to track the status of this validator",
        disableReorder: true,
        disableColumnMenu: true,
        disableExport: true,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (rowData) => (
          <a
            style={{ color: "grey" }}
            href={rowData.row.beaconcha_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LinkIcon />
          </a>
        ),
        headerClassName: "tableHeader",
        width: 60,
      },
      {
        field: "isWithdrawalEcdsa",
        headerName: "WDA is ECDSA",
        description: "Whether the withdrawal address is ECDSA or not",
        disableReorder: true,
        disableColumnMenu: true,
        disableExport: true,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (rowData) => (
          <div>
            {rowData.row.withdrawalCredentials.format === "ecdsa" ? (
              <CheckCircleIcon style={{ color: "green" }} />
            ) : rowData.row.withdrawalCredentials.format === "bls" ? (
              <CancelIcon style={{ color: "red" }} />
            ) : (
              <HelpIcon style={{ color: "grey" }} />
            )}
          </div>
        ),
        headerClassName: "tableHeader",
        width: 120,
      },
      {
        field: "pubkeyInSigner",
        headerName: "Pubkey In Signer",
        description: "Whether this pubkey is imported in the signer or not",
        disableReorder: true,
        disableColumnMenu: true,
        disableExport: true,
        sortable: false,
        align: "center",
        headerAlign: "center",
        headerClassName: "tableHeader",
        width: 150,
        renderCell: (rowData) => (
          <div>
            {rowData.row.pubkeyInSigner === true ? (
              <CheckCircleIcon style={{ color: "green" }} />
            ) : rowData.row.pubkeyInSigner ? (
              <CancelIcon style={{ color: "red" }} />
            ) : (
              <HelpIcon style={{ color: "grey" }} />
            )}
          </div>
        ),
      },
      {
        field: "pubkeyInValidator",
        headerName: "Pubkey In Validator",
        description:
          "Whether this pubkey is imported in the validator client or not",
        disableReorder: true,
        disableColumnMenu: true,
        disableExport: true,
        sortable: false,
        align: "center",
        headerAlign: "center",
        headerClassName: "tableHeader",
        width: 150,
        renderCell: (rowData) => (
          <div>
            {rowData.row.pubkeyInValidator === true ? (
              <CheckCircleIcon style={{ color: "green" }} />
            ) : rowData.row.pubkeyInValidator ? (
              <CancelIcon style={{ color: "red" }} />
            ) : (
              <HelpIcon style={{ color: "grey" }} />
            )}
          </div>
        ),
      },
      {
        field: "feeRecipientImported",
        headerName: "Fee Recipient Imported",
        description:
          "Whether this fee recipient is imported in the validator client or not",
        disableReorder: true,
        disableColumnMenu: true,
        disableExport: true,
        sortable: false,
        align: "center",
        headerAlign: "center",
        headerClassName: "tableHeader",
        width: 180,
        renderCell: (rowData) => (
          <div>
            {rowData.row.feeRecipientImported === true ? (
              <CheckCircleIcon style={{ color: "green" }} />
            ) : rowData.row.feeRecipientImported ? (
              <CancelIcon style={{ color: "red" }} />
            ) : (
              <HelpIcon style={{ color: "grey" }} />
            )}
          </div>
        ),
      }
    );

  async function getValidatorSummaryURL() {
    if (!beaconchaApiParamsMap?.get(network)) {
      setValidatorSummaryURL("");
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Error);
      return;
    }

    let allValidatorsInfo: BeaconchaGetResponse[];

    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.InProgress);

    try {
      allValidatorsInfo = await api.beaconchaFetchAllValidatorsInfo(
        selectedRows.map((row) => rows[row as number].pubkey)
      );
    } catch (e) {
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NoIndexes);
      setValidatorSummaryURL("");
      return;
    }

    const summaryUrlBuilt = buildValidatorSummaryURL({
      allValidatorsInfo,
      network,
    });

    setValidatorSummaryURL(summaryUrlBuilt);
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Success);
  }

  async function openDashboardTab() {
    if (validatorSummaryURL) {
      window.open(validatorSummaryURL, "_blank", "noopener, noreferrer");
    }
  }

  function areAllSelectedRowsExitable() {
    return selectedRows.every(
      (row) => rows[row as number].tag !== "rocketpool"
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <HeaderTypography text={"Validators"} />
        <div>
          {summaryUrlBuildingStatus ===
          BeaconchaUrlBuildingStatus.InProgress ? (
            <Tooltip title="Loading dashboard">
              <CircularProgress size={18} style={{ color: "#808080" }} />
            </Tooltip>
          ) : (
            <Tooltip title="Go to Beaconcha.in dashboard for selected validators">
              <IconButton
                disabled={!areRowsSelected}
                onClick={async () => {
                  await getValidatorSummaryURL();
                  await openDashboardTab();
                }}
              >
                <LinkIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Edit validators fee recipient">
            <IconButton
              disabled={!areRowsSelected}
              onClick={() => setEditFeesOpen(true)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete validators">
            <IconButton
              disabled={!areRowsSelected}
              onClick={() => setDeleteOpen(true)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Exit validators (In order to exit a Rocket Pool validator, please go to the Rocket Pool package UI)">
            <IconButton
              disabled={!areRowsSelected || !areAllSelectedRowsExitable()}
              onClick={() => setExitOpen(true)}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <div style={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={customRows}
          onCellClick={(params) => {
            if (
              params.field === "validating_pubkey" ||
              params.field === "fee_recipient"
            )
              navigator.clipboard.writeText(params.value);
          }}
          columns={columns}
          pageSize={pageSize}
          rowsPerPageOptions={[10, 20, 50, 100]}
          onPageSizeChange={() => setPageSize(pageSize)}
          checkboxSelection
          onSelectionModelChange={(selectionModel: GridSelectionModel) =>
            setSelectedRows(selectionModel)
          }
          sx={{ borderRadius: 2 }}
        />
      </div>
      <Box
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "row-reverse",
        }}
      >
        <Link
          style={{ textDecoration: "none" }}
          to={{ pathname: "/import", search: window.location.search }}
        >
          <Button
            variant="contained"
            sx={{ borderRadius: 2 }}
            endIcon={<UploadFileIcon />}
          >
            Import
          </Button>
        </Link>
      </Box>
    </>
  );
}

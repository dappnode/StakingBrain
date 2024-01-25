import { DataGrid, GridSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { beaconchaApiParamsMap } from "../../params";
import {
  BeaconchaGetResponse,
  CustomValidatorGetResponse,
  CustomValidatorUpdateRequest,
  SmoothValidatorByIndexApiResponse,
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
import {
  BeaconchaUrlBuildingStatus,
  MevSpSubscriptionStatus,
  SmoothStatusByPubkey,
} from "../../types";
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

    useState<CustomValidatorUpdateRequest>();
  const [validatorsSubscriptionMap, setValidatorsData] =
    useState<SmoothStatusByPubkey>({});
  const [validatorsSubscriptionMapError, setValidatorsSubscriptionError] =
    useState<string>();

  // Check that Smooth API returns an expected response format
  function isValidResponse(response: any): boolean {
    return (
      response &&
      (Array.isArray(response.found_validators) || response.found_validators === null) &&
      (Array.isArray(response.not_found_validators) || response.not_found_validators === null)
    );
  }
  
  // For a given list of validators, get their subscription status from the Oracle
  const fetchValidatorsData = async (rows: CustomValidatorGetResponse[]) => {
    const newValidatorSubscriptionStatus: SmoothStatusByPubkey = {};
    // only fetch data if index could be fetched for all validators
    if (rows.every((row) => row.index)) {
      try {
        // Split the indices into batches of 100 or less
        const clonedRows = [...rows];
        const batches = [];
        while (clonedRows.length) {
          batches.push(clonedRows.splice(0, 100));
        }

        for (const batch of batches) {
          const apiUrl =
            network === "mainnet" ? MAINNET_ORACLE_URL : TESTNET_ORACLE_URL;

          // Call the Oracle API to get the subscription status of the validators in the batch by their index
          const response = await fetch(
            `${apiUrl}/memory/validatorsbyindex/${batch
              .map((row) => row.index)
              .join()}`
          );

          const data: SmoothValidatorByIndexApiResponse = await response.json();
          console.log(data)
          if (!isValidResponse(data)) {
            throw new Error(
              "Unexpected response structure when calling Oracle! Could not fetch validator subscription status"
            );
          }

          // Check if the response is not ok
          if (!response.ok) {
            throw new Error(`HTTP error when calling Oracle! ${response}`);
          }
          // If we get here, we assume the response is ok and process the data
          const foundValidators = data.found_validators || []; //treat array as empty if undefined to avoid errors
          for (const foundValidator of foundValidators) {
            newValidatorSubscriptionStatus[foundValidator.validator_key] =
              foundValidator.status;
          }
          // process not found validators and mark them as unsubscribed
          const notFoundValidators = data.not_found_validators || []; //treat array as empty if undefined to avoid errors
          for (const notFoundValidator of notFoundValidators) {
            const notFoundValitoString = notFoundValidator.toString();
            // find the validator in the batch and mark it as not subscribed
            const validator = batch.find(
              (validator) => validator.index === notFoundValitoString
            );
            if (validator) {
              newValidatorSubscriptionStatus[validator.pubkey] =
                MevSpSubscriptionStatus.NOT_SUBSCRIBED;
            }
          }
        }
        setValidatorsData(newValidatorSubscriptionStatus);
        setValidatorsSubscriptionError(undefined);
      } catch (e) {
        setValidatorsSubscriptionError(e.message);
        console.error("Oracle API Error: ", e.message);
      }
    } else {
      console.error(
        "Skipping Oracle subscription status fetch, not all validator indexes could be fetched"
      );
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
    {
      field: "spSubscription",
      headerName: "Smooth",
      description:
        "Dappnode's Smooth subscription status. Smooth states can take up to 40 minutes to update.",
      disableReorder: true,
      disableColumnMenu: true,
      disableExport: true,
      sortable: false,
      align: "center",
      headerAlign: "center",
      headerClassName: "tableHeader",
      renderCell: (rowData) => {

        // only render smooth status if tag is "solo"
        if (rowData.row.tag === "solo") {
          const indexWithdrawalAvailable =
            rowData.row.index !== undefined &&
            rowData.row.withdrawalCredentials.format !== "error";
          const hasSubscriptionError =
            validatorsSubscriptionMapError !== undefined;

          // if index is available and there was no error calling oracle, render unknown status
          if (indexWithdrawalAvailable && !hasSubscriptionError) {
            const validatorSubscriptionStatus =
              validatorsSubscriptionMap[rowData.row.pubkey];

            // wait for validatorSubscriptionStatus to be fetched
            if (validatorSubscriptionStatus) {
              return (
                <SmoothStatus
                  rowData={rowData}
                  subscriptionStatus={validatorSubscriptionStatus}
                  network={network}
                />
              );
            } else {
              return <span>Loading...</span>;
            }
          } else {
            const errorTitle = hasSubscriptionError
              ? validatorsSubscriptionMapError
              : "Validator subscription status could not be fetched. Is your consensus client synced?";
            return (
              <Tooltip title={errorTitle}>
                <HelpIcon style={{ color: "red" }} />
              </Tooltip>
            );
          }
        } else {
          return <span>-</span>;
        }
      },
    },
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
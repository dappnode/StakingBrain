import type { JSX } from "react";
import { DataGrid, GridAlignment, GridRowId } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { blockExplorerUrls } from "../../params";
import {
  MAINNET_ORACLE_URL,
  TESTNET_ORACLE_URL,
  nonEditableFeeRecipientTags,
  NonEditableFeeRecipientTag
} from "@stakingbrain/common";
import SmoothStatus from "./SmoothStatus";
import { GridColDef } from "@mui/x-data-grid";
import LinkIcon from "@mui/icons-material/Link";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpIcon from "@mui/icons-material/Help";
import { capitalize, Chip, IconButton, Paper, Stack, Tooltip } from "@mui/material";
import { PageHeader } from "../Layout/PageLayout";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import { Box } from "@mui/system";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import { BeaconchaUrlBuildingStatus, SmoothStatusByPubkey } from "../../types";
import buildValidatorSummaryURL from "../../utils/buildValidatorSummaryURL";
import LogoutIcon from "@mui/icons-material/Logout";
import { selectedGridRowIds } from "../../utils/dataUtils";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";
import { SmoothValidatorByIndexApiResponse, SmoothValidator, MevSpSubscriptionStatus } from "../../types";

export default function KeystoresDataGrid({
  rows,
  areRowsSelected,
  selectedRows,
  setSelectedRows,
  network,
  userMode,
  setDeleteOpen,
  setEditFeesOpen,
  setBuilderConfigOpen,
  setExitOpen,
  setSummaryUrlBuildingStatus,
  mevSpFeeRecipient
}: {
  rows: CustomValidatorGetResponse[];
  areRowsSelected: boolean;
  selectedRows: GridRowId[];
  setSelectedRows: (selectedRows: GridRowId[]) => void;
  network: string;
  userMode: "basic" | "advanced";
  setDeleteOpen(open: boolean): void;
  setEditFeesOpen(open: boolean): void;
  setBuilderConfigOpen(open: boolean): void;
  setExitOpen(open: boolean): void;
  setSummaryUrlBuildingStatus: (status: BeaconchaUrlBuildingStatus) => void;
  mevSpFeeRecipient: string | null;
}): JSX.Element {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const blockExplorerUrl = blockExplorerUrls.get(network);

  useEffect(() => {
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NotStarted);
  }, [selectedRows, network, rows]);

  const [validatorsSubscriptionMap, setValidatorsSubscriptionMap] = useState<SmoothStatusByPubkey | null>(null);

  const [oracleCallError, setOracleCallError] = useState<string>();

  // Check that Smooth API returns an expected response format
  function isValidOracleResponse(response: SmoothValidatorByIndexApiResponse): boolean {
    return (
      response &&
      (Array.isArray(response.found_validators) || response.found_validators === null) &&
      (Array.isArray(response.not_found_validators) || response.not_found_validators === null)
    );
  }

  // This function fetches the subscription status of the validators in the rows array
  // It uses the validator index to fetch the status from the Oracle API
  // It updates the validatorsSubscriptionMap state with the new data
  const fetchValidatorsData = async (rows: CustomValidatorGetResponse[]) => {
    const newValidatorSubscriptionStatus: SmoothStatusByPubkey = {};

    // Initialize all validators with "UNKNOWN" status
    rows.forEach((row) => {
      if (row.pubkey) {
        newValidatorSubscriptionStatus[row.pubkey] = MevSpSubscriptionStatus.UNKNOWN;
      }
    });

    try {
      const apiUrl = network === "mainnet" ? MAINNET_ORACLE_URL : TESTNET_ORACLE_URL;

      const healthCheckResponse = await fetch(`${apiUrl}/status`);
      const healthCheckData = await healthCheckResponse.json();

      if (!healthCheckData.is_oracle_in_sync) {
        throw new Error("Oracle is not in sync. Please try again later.");
      }

      // Filter rows to include only those with an index
      const rowsWithIndexAndTagSolo = rows.filter((row) => row.index && row.tag === "solo");

      // Initialize an array to hold the batches
      const batches = [];
      // Create a helper array from rows to avoid modifying the original array
      const helperArray = [...rowsWithIndexAndTagSolo];
      // Split the indices into batches of 100 or less
      while (helperArray.length) {
        batches.push(helperArray.splice(0, 100));
      }

      for (const batch of batches) {
        // Call the Oracle API to get the subscription status of the validators in the batch by their index
        const oracleApiResponse = await fetch(
          `${apiUrl}/memory/validatorsbyindex/${batch.map((row) => row.index).join(",")}`
        );

        if (!oracleApiResponse.ok) {
          throw new Error(`HTTP error when calling Oracle! Please try again later. ${oracleApiResponse}`);
        }

        const oracleJsonResponse = await oracleApiResponse.json();
        if (!isValidOracleResponse(oracleJsonResponse)) {
          throw new Error(
            "Unexpected response structure when calling Oracle! Could not fetch validator subscription status"
          );
        }

        // Update the subscription status of the validators in the batch (had index)
        // Mark validators in the found_validators array with their subscription status
        const foundValidators = oracleJsonResponse.found_validators || []; // if null, set to empty array to avoid errors
        foundValidators.forEach((foundValidator: SmoothValidator) => {
          newValidatorSubscriptionStatus[foundValidator.validator_key] = foundValidator.status;
        });

        // Mark validators not in the found_validators array as NOT_SUBSCRIBED
        batch.forEach((validator) => {
          const validatorNotFound = !foundValidators.some(
            (foundValidator: { validator_key: string }) => foundValidator.validator_key === validator.pubkey
          );
          if (validatorNotFound) {
            newValidatorSubscriptionStatus[validator.pubkey] = MevSpSubscriptionStatus.NOT_SUBSCRIBED;
          }
        });
      }

      setValidatorsSubscriptionMap(newValidatorSubscriptionStatus);
      setOracleCallError(undefined);
    } catch (e) {
      setOracleCallError("Error fetching subscription status. Oracle might be down: " + e.message);
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
      headerName: "Public key",
      description: "Validating Public Key",
      disableColumnMenu: true,
      headerClassName: "tableHeader",
      flex: 1,
      minWidth: 120
    },
    {
      field: "feeRecipient",
      headerName: "Fee recipient",
      description: "Address to which the rewards generated from proposing a block are sent",
      disableReorder: true,
      disableColumnMenu: true,
      disableExport: true,
      sortable: false,
      align: "center",
      headerAlign: "center",
      headerClassName: "tableHeader",
      flex: 1,
      minWidth: 120
    },
    // Only render Smooth column if mevSpFeeRecipient is not null (mainnet or hoodi)
    ...(mevSpFeeRecipient != null && (network === "mainnet" || network === "hoodi")
      ? [
          {
            field: "spSubscription",
            headerName: "Smooth",
            description: "Dappnode's Smooth subscription status. Smooth states can take up to 40 minutes to update.",
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
                      validatorsSubscriptionMap ? validatorsSubscriptionMap[rowData.row.pubkey] : null
                    }
                    mevSpFeeRecipient={mevSpFeeRecipient}
                    oracleCallError={oracleCallError}
                  />
                );
              } else {
                return <span>-</span>;
              }
            }
          }
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
              display: "block"
            }}
            alt={rowData.row.tag}
            src={"/assets/tagIcons/" + rowData.row.tag + ".png"}
          />
        </Tooltip>
      )
    }
  ];

  const customRows = rows.map((row, index) => ({
    pubkey: row.pubkey,
    explorerUrl: blockExplorerUrl ? blockExplorerUrl + "/validator/" + row.pubkey : "",
    feeRecipient: row.feeRecipient,
    index: row.index,
    tag: row.tag,
    withdrawalCredentials: row.withdrawalCredentials,
    pubkeyInValidator: row.validatorImported,
    pubkeyInSigner: row.signerImported,
    feeRecipientImported: row.validatorFeeRecipientCorrect,
    builderConfig: row.builderConfig,
    builderConfigStatus: row.builderConfigStatus,
    id: index
  }));

  if (userMode === "advanced")
    columns.push(
      {
        field: "builderConfigStatus",
        headerName: "Builder config",
        description: "Last application attempt; open Builder config to inspect client values and refresh status",
        width: 180,
        sortable: false,
        renderCell: ({ row }) => (
          <Tooltip title={row.builderConfigStatus?.message ?? "Open Builder config for details"}>
            <span>
              {capitalize(
                row.builderConfigStatus?.status ?? (row.builderConfig === undefined ? "Unmanaged" : "Pending")
              )}
            </span>
          </Tooltip>
        )
      },
      {
        field: "explorerUrl",
        headerName: "URL",
        description: "Explorer URL to track the status of this validator",
        disableReorder: true,
        disableColumnMenu: true,
        disableExport: true,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (rowData) => (
          <IconButton
            component="a"
            size="small"
            aria-label="View validator in explorer"
            href={rowData.row.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        ),
        headerClassName: "tableHeader",
        width: 60
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
              <CheckCircleIcon color="success" />
            ) : rowData.row.withdrawalCredentials.format === "bls" ? (
              <CancelIcon color="error" />
            ) : (
              <HelpIcon color="action" />
            )}
          </div>
        ),
        headerClassName: "tableHeader",
        width: 120
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
              <CheckCircleIcon color="success" />
            ) : rowData.row.pubkeyInSigner === false ? (
              <CancelIcon color="error" />
            ) : (
              <HelpIcon color="action" />
            )}
          </div>
        )
      },
      {
        field: "pubkeyInValidator",
        headerName: "Pubkey In Validator",
        description: "Whether this pubkey is imported in the validator client or not",
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
              <CheckCircleIcon color="success" />
            ) : rowData.row.pubkeyInValidator === false ? (
              <CancelIcon color="error" />
            ) : (
              <HelpIcon color="action" />
            )}
          </div>
        )
      },
      {
        field: "feeRecipientImported",
        headerName: "Fee Recipient Imported",
        description: "Whether this fee recipient is imported in the validator client or not",
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
              <CheckCircleIcon color="success" />
            ) : rowData.row.feeRecipientImported === false ? (
              <CancelIcon color="error" />
            ) : (
              <HelpIcon color="action" />
            )}
          </div>
        )
      }
    );

  function openDashboardTab() {
    if (!blockExplorerUrl) {
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Error);
      return;
    }

    const summaryUrl = buildValidatorSummaryURL({
      validatorIndexes: selectedRows.map((row) => rows[row as number]?.index ?? ""),
      network
    });

    if (!summaryUrl) {
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NoIndexes);
      return;
    }

    window.open(summaryUrl, "_blank", "noopener,noreferrer");
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.Success);
  }

  function areAllSelectedRowsExitable() {
    return selectedRows.every((row) => rows[row as number].tag !== "rocketpool");
  }

  function areAllSelectedRowsUneditable() {
    return selectedRows.every((row) => {
      const tag = rows[row as number].tag;
      return nonEditableFeeRecipientTags.includes(tag as NonEditableFeeRecipientTag);
    });
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
      <PageHeader
        title="Validators"
        subtitle="Manage keys, fee recipients, and builder settings."
        icon={<VpnKeyOutlinedIcon />}
        action={
          <Button
            component={Link}
            to={{ pathname: "/import", search: window.location.search }}
            variant="contained"
            startIcon={<UploadFileIcon />}
          >
            Import validators
          </Button>
        }
      />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ my: 3 }}
      >
        <Chip
          size="small"
          variant="outlined"
          label={selectedRows.length ? `${selectedRows.length} selected` : `${rows.length} validators`}
        />
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
          <Tooltip title="Go to explorer dashboard for selected validators">
            <IconButton aria-label="Open validator dashboard" disabled={!areRowsSelected} onClick={openDashboardTab}>
              <LinkIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit validators fee recipient">
            <Button
              size="small"
              startIcon={<EditIcon />}
              disabled={!areRowsSelected || areAllSelectedRowsUneditable()}
              onClick={() => setEditFeesOpen(true)}
            >
              Fee recipient
            </Button>
          </Tooltip>

          <Button
            size="small"
            startIcon={<TuneIcon />}
            disabled={!areRowsSelected}
            onClick={() => setBuilderConfigOpen(true)}
          >
            Builder settings
          </Button>

          <Tooltip title="Delete validators">
            <IconButton aria-label="Delete validators" disabled={!areRowsSelected} onClick={() => setDeleteOpen(true)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Exit validators (In order to exit a Rocket Pool validator, please go to the Rocket Pool package UI)">
            <IconButton
              aria-label="Exit validators"
              disabled={!areRowsSelected || !areAllSelectedRowsExitable()}
              onClick={() => setExitOpen(true)}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Box sx={{ width: "100%", height: { xs: 440, sm: 520 } }}>
        <DataGrid
          rows={customRows}
          onCellClick={(params) => {
            if (params.field === "validating_pubkey" || params.field === "fee_recipient")
              navigator.clipboard.writeText(String(params.value));
          }}
          columns={columns}
          paginationModel={paginationModel}
          pageSizeOptions={[10, 20, 50, 100]}
          onPaginationModelChange={setPaginationModel}
          checkboxSelection
          disableRowSelectionExcludeModel
          rowSelectionModel={{ type: "include", ids: new Set(selectedRows) }}
          onRowSelectionModelChange={(selectionModel) =>
            setSelectedRows(selectedGridRowIds(selectionModel, customRows))
          }
          sx={{
            borderRadius: 2.5,
            "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
            "& .MuiDataGrid-cell--textCenter": { justifyContent: "center" },
            "& .MuiDataGrid-cell svg": { display: "block" },
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 600 },
            "& .MuiDataGrid-columnHeader": { bgcolor: "action.hover" }
          }}
        />
      </Box>
    </Paper>
  );
}

import { DataGrid, GridSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import {
  beaconchaApiParamsMap,
  MEV_SP_ADDRESS_MAINNET,
  MEV_SP_ADDRESS_PRATER,
} from "../../params";
import {
  BeaconchaGetResponse,
  CustomValidatorGetResponse,
  CustomValidatorUpdateRequest,
  Tag,
} from "@stakingbrain/common";
import { GridColDef } from "@mui/x-data-grid";
import LinkIcon from "@mui/icons-material/Link";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpIcon from "@mui/icons-material/Help";
import WarningIcon from "@mui/icons-material/Warning";
import BlockIcon from "@mui/icons-material/Block";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import CloseIcon from "@mui/icons-material/Close";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";

import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { HeaderTypography } from "../../Styles/Typographies";
import { Box, darken } from "@mui/system";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import {
  BasicValidatorRow,
  BeaconchaUrlBuildingStatus,
  MevSpSubscriptionStatus,
  ValidatorData,
  ValidatorDataMap,
} from "../../types";
import { api } from "../../api";
import buildValidatorSummaryURL from "../../utils/buildValidatorSummaryURL";
import LogoutIcon from "@mui/icons-material/Logout";
import SetSmoothingPoolDialog from "../Dialogs/SetSmoothingPoolDialog";

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
  mevSpFeeRecipient: string;
}): JSX.Element {
  const [pageSize, setPageSize] = useState(rows.length > 10 ? 10 : rows.length);
  const beaconchaBaseUrl = beaconchaApiParamsMap.get(network)?.baseUrl;
  const [validatorSummaryURL, setValidatorSummaryURL] = useState<string>("");
  const [mevSpOpen, setSetMevSpOpen] = useState(false);
  const [validatorToSubscribeConfig, setValidatorToSubscribeSpConfig] =
    useState<CustomValidatorUpdateRequest>();
  const [validatorData, setValidatorData] = useState<ValidatorDataMap>({});

  const fetchValidatorData = async (rows: CustomValidatorGetResponse[]) => {
    const newData: ValidatorDataMap = {};
    try {
      // Split the indices into batches of 100 or less
      const clonedRows = [...rows];
      const batches = [];
      while (clonedRows.length) {
        batches.push(clonedRows.splice(0, 100));
      }

      for (const batch of batches) {
        const apiUrl =
          network === "mainnet"
            ? "https://sp-api.dappnode.io"
            : "http://65.109.102.216:7300";
        const response = await fetch(
          `${apiUrl}/memory/validatorsbyindex/${batch
            .map((row) => row.index)
            .join()}`
        );
        const data = await response.json();
        // Check if the response is not ok
        if (!response.ok) {
          throw new Error(`HTTP error when calling Oracle! ${response}`);
        }
        // If we get here, we assume the response is ok and process the data
        const foundValidators = data.found_validators || []; //treat array as empty if undefined to avoid errors
        for (const foundValidator of foundValidators) {
          newData[foundValidator.validator_key] = {
            index: foundValidator.validator_index,
            subscriptionStatus: foundValidator.status,
          };
        }
        // process not found validators and mark them as unsubscribed
        const notFoundValidators = data.not_found_validators || []; //treat array as empty if undefined to avoid errors
        for (const notFoundValidator of notFoundValidators) {
          const notFoundValitoString = notFoundValidator.toString();
          const validator = batch.find(
            (validator) => validator.index === notFoundValitoString
          );
          if (validator) {
            newData[validator.pubkey] = {
              index: validator.index,
              subscriptionStatus: MevSpSubscriptionStatus.NOT_SUBSCRIBED,
            };
          }
        }
      }
      console.log(newData);
      setValidatorData(newData);
    } catch {
      console.log("error");
    }
  };

  useEffect(() => {
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NOT_STARTED);
    setValidatorSummaryURL("");
  }, [selectedRows]);

  useEffect(() => {
    openDashboardTab();
  }, [validatorSummaryURL]);

  useEffect(() => {
    if (rows.length > 0) {
      fetchValidatorData(rows);
    }
  }, []);

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
        //TODO: this cell's content should only be rendered when consensus client is online, because if it isnt, we
        // cant check withdrawal credentials format

        // only solo validators can be subscribed to Smooth
        if (rowData.row.tag === "solo") {
          const pubkey = rowData.row.pubkey;
          const validatorInfo = validatorData[pubkey];

          // once validatorData is fetched, return Smooth status of that validator 
          if (validatorInfo) {
            const isMainnet = network === "mainnet";
            const mevSpAddress = isMainnet
              ? MEV_SP_ADDRESS_MAINNET
              : MEV_SP_ADDRESS_PRATER;

            if (
              validatorInfo.subscriptionStatus.toLowerCase() ===
                "notsubscribed" &&
              rowData.row.feeRecipient === mevSpAddress &&
              rowData.row.withdrawalCredentials.format === "ecdsa"
            ) {
              return (
                <Tooltip
                  title="Awaiting Subscription. This validator will subscribe automatically when it proposes a block. Changes to 
              the state can take up to 40 minutes to update"
                >
                  <HourglassTopIcon style={{ color: "orange" }} />
                </Tooltip>
              );
            } else if (
              (validatorInfo.subscriptionStatus.toLowerCase() === "active" ||
                validatorInfo.subscriptionStatus.toLowerCase() ===
                  "yellowcard" ||
                validatorInfo.subscriptionStatus.toLowerCase() === "redcard") &&
              rowData.row.feeRecipient !== mevSpAddress
            ) {
              return (
                <Tooltip
                  title="Wrong Fee Recipient! This validator is subscribed to Smooth, but it's fee recipient is not set to Smooth's address.
              Please change it to Smooth's address as soon as possible!"
                >
                  <CrisisAlertIcon style={{ color: "red" }} />
                </Tooltip>
              );
            } else if (
              rowData.row.feeRecipient === mevSpAddress &&
              rowData.row.withdrawalCredentials.format !== "ecdsa"
            ) {
              return (
                <Tooltip
                  title="Wrong Withdrawal Address Format! This validator is subscribed to Smooth, but it's withdrawal address format is not ETH1 execution format.
              Please change it to ETH1 execution format as soon as possible!"
                >
                  <CrisisAlertIcon style={{ color: "red" }} />
                </Tooltip>
              );
            }

            switch (validatorInfo.subscriptionStatus.toLowerCase()) {
              case "active":
                return (
                  <Tooltip title="Active">
                    <CheckCircleIcon style={{ color: "green" }} />
                  </Tooltip>
                );
              case "yellowcard":
                return (
                  <Tooltip title="Yellow Card">
                    <WarningIcon style={{ color: "yellow" }} />
                  </Tooltip>
                );
              case "redcard":
                return (
                  <Tooltip title="Red Card">
                    <WarningIcon style={{ color: "red" }} />
                  </Tooltip>
                );
              case "banned":
                return (
                  <Tooltip title="Banned">
                    <BlockIcon style={{ color: "red" }} />
                  </Tooltip>
                );
              case "notsubscribed":
                return (
                  <Tooltip title="Not Subscribed">
                    <CloseIcon style={{ color: "grey" }} />
                  </Tooltip>
                );
              default:
                return (
                  <Tooltip title="There was an error getting this validator's Smooth status.">
                    <HelpIcon style={{ color: "grey" }} />
                  </Tooltip>
                );
            }
          } else {
            return <span>Loading...</span>; //return Loading if validatorData is not fetched yet
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
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.ERROR);
      return;
    }

    let allValidatorsInfo: BeaconchaGetResponse[];

    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.IN_PROGRESS);

    try {
      allValidatorsInfo = await api.beaconchaFetchAllValidatorsInfo(
        selectedRows.map((row) => rows[row as number].pubkey)
      );
    } catch (e) {
      setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.NO_INDEXES);
      setValidatorSummaryURL("");
      return;
    }

    const summaryUrlBuilt = buildValidatorSummaryURL({
      allValidatorsInfo,
      network,
    });

    setValidatorSummaryURL(summaryUrlBuilt);
    setSummaryUrlBuildingStatus(BeaconchaUrlBuildingStatus.SUCCESS);
  }

  const showSmoothingPoolSubscriptionDialog = (row: number) => {
    setValidatorToSubscribeSpConfig({
      pubkey: rows[row].pubkey,
      feeRecipient: rows[row].feeRecipient,
    });

    setSetMevSpOpen(true);
  };

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
          BeaconchaUrlBuildingStatus.IN_PROGRESS ? (
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

      {validatorToSubscribeConfig && (
        <SetSmoothingPoolDialog
          open={mevSpOpen}
          setOpen={setSetMevSpOpen}
          validatorCurrentConfig={validatorToSubscribeConfig}
          mevSpFeeRecipient={mevSpFeeRecipient}
        />
      )}
    </>
  );
}

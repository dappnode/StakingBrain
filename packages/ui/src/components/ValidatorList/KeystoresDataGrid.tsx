import { DataGrid, GridSelectionModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { beaconchaApiParamsMap } from "../../params";
import {
  BeaconchaGetResponse,
  CustomValidatorGetResponse,
  CustomValidatorUpdateRequest,
  isFeeRecipientEditable,
  nonEditableFeeRecipientTags,
  Tag,
} from "@stakingbrain/common";
import { GridColDef } from "@mui/x-data-grid";
import LinkIcon from "@mui/icons-material/Link";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpIcon from "@mui/icons-material/Help";
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

  const fetchSubscriptionStatus = async (
    validatorIndex: string
  ): Promise<string> => {
    try {
      const smoothApiUrl = network === "mainnet"
        ? "https://sp-api.dappnode.io"
        : "http://65.109.102.216:7300";
  
      const response = await fetch(`${smoothApiUrl}/memory/validator/${validatorIndex}`);
      const data = await response.json();
  
      if (response.ok) {
        switch (data.status.toLowerCase()) {
          case "active":
            return "Active";
          case "yellowcard":
            return "YellowCard";
          case "redcard":
            return "RedCard";
          case "banned":
            return "Banned";
          case "notsubscribed":
            return "Not Subscribed";
          default:
            return "Unknown Status"; // Handle not considered statuses
        }
      } else if (data.code === 400 && data.message.includes("could not find validator")) {
        return "Not Subscribed";
      } else {
        throw new Error(data.message || "Unknown error");
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      return "Error"; // Handle when something went wrong calling the Oracle API
    }
  };

  const fetchValidatorData = async (rows: CustomValidatorGetResponse[]) => {
    try {
      const newData: ValidatorDataMap = {};
      for (const row of rows) {
        const pubkey = row.pubkey;
        if (row.index !== "") {
          const subscriptionStatus = await fetchSubscriptionStatus(row.index);
          newData[pubkey] = { // save the pubkey --> index & status mapping to use it in the grid renderCell function
            index: row.index,
            subscriptionStatus,
          };
        }
      }
      
      // TODO: try to get index from beaconcha.in API ??
      // const maxRequestsPerSecond = 5;
      // const maxRequestsPerMinute = 20;
      // let requestCount = 0;
      // let startTime = new Date();

      // for (const pubkeyChunk of chunkArray(pubkeys, maxRequestsPerSecond)) {
      //   if (requestCount >= maxRequestsPerMinute) {
      //     // If max requests per minute reached, wait for the remaining time in the minute
      //     const currentTime = new Date();
      //     const timeElapsed = currentTime.getTime() - startTime.getTime();
      //     if (timeElapsed < 60000) {
      //       await delay(60000 - timeElapsed);
      //     }
      //     startTime = new Date();
      //     requestCount = 0;
      //   }
  
      //   const validatorsInfo = await api.beaconchaFetchValidatorsInfo(pubkeyChunk);
      //   for (const validator of validatorsInfo.data) {
      //     if (validator.pubkey && validator.validatorindex !== undefined) {
      //       const subscriptionStatus = await fetchSubscriptionStatus(
      //         validator.validatorindex
      //       );
      //       newData[validator.pubkey] = {
      //         index: validator.validatorindex,
      //         subscriptionStatus,
      //       };
      //     }
      //   }
  
      //   requestCount += pubkeyChunk.length;
      //   await delay(1000); // Wait for 1 second before the next batch
      // }
  
      setValidatorData(newData);
    } catch (error) {
      console.error("Error fetching validator data:", error);
    }
  };
  
  // // Utility function to create chunks from an array
  // function chunkArray(array: any[], chunkSize: number): any[][] {
  //   const chunks = [];
  //   for (let i = 0; i < array.length; i += chunkSize) {
  //     chunks.push(array.slice(i, i + chunkSize));
  //   }
  //   return chunks;
  // }
  
  // // Utility function to delay execution
  // function delay(ms: number): Promise<void> {
  //   return new Promise(resolve => setTimeout(resolve, ms));
  // }
  

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
      description: "Dappnode's Smooth subscription status",
      disableReorder: true,
      disableColumnMenu: true,
      disableExport: true,
      sortable: false,
      align: "center",
      headerAlign: "center",
      headerClassName: "tableHeader",
      renderCell: (rowData) => {
        const pubkey = rowData.row.pubkey;
        const validatorInfo = validatorData[pubkey];

        if (validatorInfo) {
          return <span>{validatorInfo.subscriptionStatus}</span>;
        } else {
          return <span>Loading...</span>;
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
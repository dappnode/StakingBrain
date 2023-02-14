import { DataGrid, GridSelectionModel } from "@mui/x-data-grid";
import { useState } from "react";
import { beaconchaApiParamsMap } from "../../params";
import { CustomValidatorGetResponse, Tag } from "@stakingbrain/common";
import Chip from "@mui/material/Chip";
import { GridColDef } from "@mui/x-data-grid";
import LinkIcon from "@mui/icons-material/Link";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { HeaderTypography } from "../../Styles/Typographies";
import { Box } from "@mui/system";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import { BeaconchaUrlBuildingStatus } from "../../types";

export default function KeystoresDataGrid({
  rows,
  areRowsSelected,
  setSelectedRows,
  network,
  userMode,
  setDeleteOpen,
  setEditFeesOpen,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isTableEmpty,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validatorSummaryURL,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  summaryUrlBuildingStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadSummaryUrl,
}: {
  rows: CustomValidatorGetResponse[];
  areRowsSelected: boolean;
  setSelectedRows: (arg0: GridSelectionModel) => void;
  network: string;
  userMode: "basic" | "advanced";
  setDeleteOpen(open: boolean): void;
  setEditFeesOpen(open: boolean): void;
  isTableEmpty: boolean;
  validatorSummaryURL: string;
  summaryUrlBuildingStatus: BeaconchaUrlBuildingStatus;
  loadSummaryUrl(): void;
}): JSX.Element {
  const [pageSize, setPageSize] = useState(rows.length > 10 ? 10 : rows.length);
  const beaconchaBaseUrl = beaconchaApiParamsMap.get(network)?.baseUrl;

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
        "Fee Recipient is a feature that lets you specify a priority fee recipient address on your validator client instance and beacon node",
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
        <Chip
          label={rowData.row.tag}
          variant="outlined"
          style={{
            backgroundColor: getTagColor(rowData.row.tag),
          }}
        />
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
    pubkeyImported: row.validatorImported,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderCell: (rowData: any) => (
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
        field: "pubkeyImported",
        headerName: "Pubkey Imported",
        description:
          "Weather this pubkey is imported in the validator client or not",
        disableReorder: true,
        disableColumnMenu: true,
        disableExport: true,
        sortable: false,
        align: "center",
        headerAlign: "center",
        headerClassName: "tableHeader",
        width: 200,
      },
      {
        field: "feeRecipientImported",
        headerName: "Fee Recipient Imported",
        description:
          "Weather this fee recipient is imported in the validator client or not",
        disableReorder: true,
        disableColumnMenu: true,
        disableExport: true,
        sortable: false,
        align: "center",
        headerAlign: "center",
        headerClassName: "tableHeader",
        width: 200,
      }
    );

  function getTagColor(tag: Tag): string {
    switch (tag) {
      case "obol":
        return "green";
      case "diva":
        return "blue";
      case "solo":
        return "pink";
      case "stakehouse":
        return "dark";
      case "stakewise":
        return "yellow";
      case "rocketpool":
        return "#ea894d";
      case "ssv":
        return "grey";
      default:
        return "primary";
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <HeaderTypography text={"Validators"} />
        <div>
          <Tooltip title="Load validators in beaconcha">
            <IconButton
              disabled={!areRowsSelected}
              onClick={() => {
                // TODO:!
                console.log("nothing");
              }}
            >
              <LinkIcon />
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
          <Tooltip title="Edit validators fee recipient">
            <IconButton
              disabled={!areRowsSelected}
              onClick={() => setEditFeesOpen(true)}
            >
              <EditIcon />
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

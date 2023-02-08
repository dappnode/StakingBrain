//External components
import { GridColDef } from "@mui/x-data-grid";
import LinkIcon from "@mui/icons-material/Link";
import { Edit } from "@mui/icons-material";

export default function KeystoreColumns(): GridColDef[] {
  return [
    {
      field: "validating_pubkey",
      headerName: "Validating Public Key",
      description: "Validating Public Key",
      disableColumnMenu: true,
      flex: 1,
      headerClassName: "tableHeader",
    },
    {
      field: "fee_recipient",
      headerName: "Fee Recipient",
      description: "Fee recipient address for this validator",
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
    },
    {
      field: "beaconcha_url",
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
      field: "edit_fee_recipients",
      headerName: "",
      description: "Edit the fee recipient for this validator",
      disableReorder: true,
      disableColumnMenu: true,
      disableExport: true,
      sortable: false,
      align: "center",
      headerAlign: "center",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      renderCell: (rowData) => (
        <button
          style={{ color: "grey" }}
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onClick={(event) => {
            /*setSeletectedValidatorPK(rowData.row.validating_pubkey);
            setIsFeeDialogOpen(true);*/
            //TODO
          }}
        >
          <Edit />
        </button>
      ),
      headerClassName: "tableHeader",
      cellClassName: "tableCell",
      width: 60,
    },
  ];
}

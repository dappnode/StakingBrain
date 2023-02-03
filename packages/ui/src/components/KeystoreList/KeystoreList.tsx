import {
  DataGrid,
  GridCallbackDetails,
  GridSelectionModel,
  GridToolbar,
} from "@mui/x-data-grid";
import { useState } from "react";
import { beaconchaApiParamsMap } from "../../params";
import KeystoreColumns from "./KeystoreColumns";
import { CustomValidatorGetResponse } from "@stakingbrain/common";

export default function KeystoreList({
  rows,
  setSelectedRows,
  network,
}: {
  rows: CustomValidatorGetResponse[];
  setSelectedRows: (arg0: GridSelectionModel) => void;
  network: string;
}): JSX.Element {
  const selection = (
    selectionModel: GridSelectionModel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    details: GridCallbackDetails
  ) => {
    setSelectedRows(selectionModel);
  };

  const [pageSize, setPageSize] = useState(10);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pageSizeChange = (pageSize: number, details: GridCallbackDetails) => {
    setPageSize(pageSize);
  };

  const beaconchaBaseUrl = beaconchaApiParamsMap.get(network)?.baseUrl;

  const customRows = rows.map((row, index) => ({
    // only show first 12 chars from pubkey
    validating_pubkey: row.validating_pubkey,
    beaconcha_url: beaconchaBaseUrl
      ? beaconchaBaseUrl + "/validator/" + row.validating_pubkey
      : "",
    fee_recipient: row.fee_recipient || "No fee recipient",
    tag: row.tag || "No tag", //TODO: Add icon?? Then put the name of the tag when hovering over it
    id: index,
  }));

  return (
    <div style={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={customRows}
        onCellClick={(params) => {
          if (params.field === "validating_pubkey") {
            navigator.clipboard.writeText(params.value);
          }
        }}
        columns={KeystoreColumns()}
        pageSize={pageSize}
        rowsPerPageOptions={[10, 20, 50, 100]}
        onPageSizeChange={pageSizeChange}
        checkboxSelection
        disableSelectionOnClick={true}
        onSelectionModelChange={selection}
        components={{ Toolbar: GridToolbar }}
        sx={{ borderRadius: 3 }}
      />
    </div>
  );
}

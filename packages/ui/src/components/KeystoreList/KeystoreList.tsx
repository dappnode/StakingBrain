import {
  DataGrid,
  GridCallbackDetails,
  GridSelectionModel,
  GridToolbar,
} from "@mui/x-data-grid";
import { useState } from "react";
import { beaconchaApiParamsMap } from "../../params";
import KeystoreColumns from "./KeystoreColumns";
import {
  CustomValidatorGetResponse,
  shortenPubkey,
} from "@stakingbrain/common";
import { getEmoji } from "../../logic/Utils/dataUtils";

export default function KeystoreList({
  rows,
  setSelectedRows,
  network,
  mode,
}: {
  rows: CustomValidatorGetResponse[];
  setSelectedRows: (arg0: GridSelectionModel) => void;
  network: string;
  mode?: string;
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
    validating_pubkey: `${row.pubkey} ${
      mode === "development" && row.validatorImported
        ? getEmoji("imported")
        : ""
    }`,
    beaconcha_url: beaconchaBaseUrl
      ? beaconchaBaseUrl + "/validator/" + row.pubkey
      : "",
    fee_recipient: `${shortenPubkey(row.feeRecipient)} 
      ${
        mode === "development" && row.validatorFeeRecipientCorrect
          ? getEmoji("imported")
          : ""
      }`,
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

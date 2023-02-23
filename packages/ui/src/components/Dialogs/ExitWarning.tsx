import { GridSelectionModel } from "@mui/x-data-grid";
import {
  CustomValidatorGetResponse,
  shortenPubkey,
} from "@stakingbrain/common";

export default function ExitWarning({
  selectedRows,
  rows,
}: {
  selectedRows: GridSelectionModel;
  rows: CustomValidatorGetResponse[];
}): JSX.Element {
  return (
    <>
      Are you sure you want to exit these validators?
      <ul>
        {selectedRows.map((row, i) => (
          <li key={i}>
            {shortenPubkey(rows[parseInt(row.toString())].pubkey)}
          </li>
        ))}
      </ul>
      A voluntary exit is when a validator chooses to stop performing its
      duties, and exits the beacon chain permanently.
    </>
  );
}

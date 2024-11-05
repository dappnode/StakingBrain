import { GridSelectionModel } from "@mui/x-data-grid";
import { shortenPubkey } from "@stakingbrain/common";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";

export default function DeletionWarning({
  selectedRows,
  rows
}: {
  selectedRows: GridSelectionModel;
  rows: CustomValidatorGetResponse[];
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      Are you sure you want to delete these keystores?
      <ul className="flex flex-col gap-2 ml-5">
        {selectedRows.map((row, i) => (
          <li key={i}>- {shortenPubkey(rows[parseInt(row.toString())].pubkey)}</li>
        ))}
      </ul>
      After deletion, these keystores won't be used for signing anymore and your slashing protection data will be
      downloaded. 
      <b>Keep the slashing protection data for when you want to import these keystores to a new validator.</b>
    </div>
  );
}

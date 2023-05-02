import { Alert } from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import {
  CustomValidatorGetResponse,
  shortenPubkey,
  Network,
} from "@stakingbrain/common";

export default function ExitWarning({
  selectedRows,
  rows,
  network
}: {
  selectedRows: GridSelectionModel;
  rows: CustomValidatorGetResponse[];
  network: Network
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
      <Alert severity="warning">
        By exiting a validator, you are voluntarily leaving the network and
        ending your participation in the validation process. You will no longer
        earn rewards for validating transactions. You will be able to withdraw
        the validator(s) staked funds after a period of time known as the
        withdrawal period.
      </Alert>
      { network === "gnosis" && (
        <Alert severity="warning">
        Withdrawals are not enabled in Gnosis Chain yet. If you exit your validators
        you will not be able to retrieve your funds until they are available.
        </Alert>
      )}
    </>
  );
}

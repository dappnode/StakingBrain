import type { JSX } from "react";
import { Alert } from "@mui/material";
import { shortenPubkey } from "@stakingbrain/common";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";

export default function ExitWarning({ validators }: { validators: CustomValidatorGetResponse[] }): JSX.Element {
  return (
    <>
      Are you sure you want to exit these validators?
      <ul>
        {validators.map(({ pubkey }) => (
          <li key={pubkey}>{shortenPubkey(pubkey)}</li>
        ))}
      </ul>
      <Alert severity="warning">
        By exiting a validator, you are voluntarily leaving the network and ending your participation in the validation
        process. You will no longer earn rewards for validating transactions. You will be able to withdraw the
        validator(s) staked funds after a period of time known as the withdrawal period.
      </Alert>
    </>
  );
}

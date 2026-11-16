import type { JSX } from "react";
import { shortenPubkey } from "@stakingbrain/common";
import type { CustomValidatorGetResponse } from "@stakingbrain/brain";

// Long selections would push the warning and the button out of view.
const PREVIEW = 10;

export default function DeletionWarning({ validators }: { validators: CustomValidatorGetResponse[] }): JSX.Element {
  return (
    <>
      Are you sure you want to delete these keystores?
      <ul>
        {validators.slice(0, PREVIEW).map(({ pubkey }) => (
          <li key={pubkey}>{shortenPubkey(pubkey)}</li>
        ))}
        {validators.length > PREVIEW && <li>…and {validators.length - PREVIEW} more</li>}
      </ul>
      After deletion, these keystores won't be used for signing anymore and your slashing protection data will be
      downloaded. <br />
      <br />
      <b>Keep the slashing protection data for when you want to import these keystores to a new validator.</b>
    </>
  );
}

import { Tag } from "@stakingbrain/common";

export const params = {
  brainDbName: "brain-db.json",
  uiBuildDirName: "uiBuild",
  certDirName: "tls",
  burnAddress: "0x0000000000000000000000000000000000000000", // TODO: put other, teku issue
  defaultTag: "solo" as Tag,
  uiPort: 80,
  launchpadPort: 3000,
  brainPort: 5000,
  indexerPort: 7000,
  defaultValidatorsMonitorUrl: "https://validators-proofs.dappnode.io",
  defaultProofsOfValidationCron: 24 * 60 * 60 * 1000 // 1 day in ms
};

import { Network } from "@stakingbrain/common";

export const blockExplorerUrls = new Map<string, string>([
  ["mainnet", "https://beaconcha.in"],
  ["gnosis", "https://gnosischa.in"],
  ["lukso", "https://explorer.consensus.mainnet.lukso.network"],
  ["hoodi", "https://hoodi.beaconcha.in"]
]);

export interface AppParams {
  network: string;
  signerUrl: string;
  signerAuthToken?: string;
  consensusClient?: string;
  executionClient?: string;
}

export const getSmoothUrlByNetwork = (network: Network): string => {
  if (network == "hoodi") {
    return "https://smooth-hoodi.dappnode.io/";
  } else if (network == "mainnet") {
    return "https://smooth.dappnode.io/";
  } else {
    return "";
  }
};

export const getStakersLink = (network: Network): string => {
  return network === Network.Hoodi ? "http://my.dappnode/stakers/hoodi" : "http://my.dappnode/stakers/ethereum";
};

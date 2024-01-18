import { ApiParams, Network } from "@stakingbrain/common";

export const beaconchaApiParamsMap = new Map<string, Omit<ApiParams, "host">>([
  ["mainnet", { baseUrl: "https://beaconcha.in", apiPath: "/api/v1/" }],
  ["prater", { baseUrl: "https://prater.beaconcha.in", apiPath: "/api/v1/" }],
  ["gnosis", { baseUrl: "https://gnosischa.in", apiPath: "/api/v1/" }],
  [
    "lukso",
    {
      baseUrl: "https://explorer.consensus.mainnet.lukso.network",
      apiPath: "/api/v1/",
    },
  ],
  ["holesky", { baseUrl: "https://holesky.beaconcha.in", apiPath: "/api/v1/" }],
]);

export interface AppParams {
  network: string;
  signerUrl: string;
  signerAuthToken?: string;
  consensusClient?: string;
  executionClient?: string;
}

export const getSmoothingPoolUrl = (network: Network): string => {
  if (network == "prater") {
    return "https://smooth-goerli.dappnode.io/";
  } else if (network == "mainnet") {
    return "https://smooth.dappnode.io/";
  } else {
    throw new Error(
      "MEV Smoothing Pool Address can only be set in Prater or Mainnet"
    );
  }
};

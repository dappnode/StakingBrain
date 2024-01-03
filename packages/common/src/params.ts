import { Network } from "./types";

export const burnAddress = "0x0000000000000000000000000000000000000000";

//Rocket Pool Fee Recipient depends on the network (mainnet, goerli)
export const rocketPoolFeeRecipient =
  "0xd4E96eF8eee8678dBFf4d535E033Ed1a4F7605b7";

export const smoothFeeRecipient = (network: Network): string | null => {
  switch (network) {
    case "mainnet":
      return "0xAdFb8D27671F14f297eE94135e266aAFf8752e35";
    case "prater":
      return "0xF21fbbA423f3a893A2402d68240B219308AbCA46";
    default:
      return null;
  }
};

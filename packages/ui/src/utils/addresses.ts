import {
  BURN_ADDRESS,
  MEV_SP_ADDRESS_MAINNET,
  MEV_SP_ADDRESS_PRATER,
  Network,
} from "@stakingbrain/common";

export const getSmoothAddressByNetwork = (network: Network) => {
  if (network == "prater") {
    return MEV_SP_ADDRESS_PRATER;
  } else if (network == "mainnet") {
    return MEV_SP_ADDRESS_MAINNET;
  } else if (network == "holesky") {
    return null;
  } else if (network == "gnosis") {
    return null;
  } else if (network == "lukso") {
    return null;
  } else {
    throw new Error(
      "MEV Smoothing Pool Address can only be set in Prater or Mainnet"
    );
  }
};

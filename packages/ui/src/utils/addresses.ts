import {
    MEV_SP_ADDRESS_MAINNET,
    MEV_SP_ADDRESS_PRATER,
    Network,
  } from "@stakingbrain/common";
  
  export const getSmoothingPoolAddress = (network: Network) => {
    if (network == "prater") {
      return MEV_SP_ADDRESS_PRATER;
    } else if (network == "mainnet") {
      return MEV_SP_ADDRESS_MAINNET;
    } else {
      throw new Error(
        "MEV Smoothing Pool Address can only be set in Prater or Mainnet"
      );
    }
  };
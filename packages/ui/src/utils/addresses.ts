import {
  MEV_SP_ADDRESS_MAINNET,
  MEV_SP_ADDRESS_PRATER,
  Network,
} from "@stakingbrain/common";

export const getSmoothAddressByNetwork = (network: Network) => {
  if (network == "prater") {
    return MEV_SP_ADDRESS_PRATER;
  } else if (network == "mainnet") {
    return MEV_SP_ADDRESS_MAINNET;
  } else {
    return null;
  }
};

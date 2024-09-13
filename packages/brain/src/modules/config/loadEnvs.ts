import { Network } from "@stakingbrain/common";

export function loadEnvs(): {
  network: Network;
  executionClientSelected: string;
  consensusClientSelected: string;
  isMevBoostSet: boolean;
  shareDataWithDappnode: boolean;
} {
  const network = process.env.NETWORK;
  if (!network) throw Error("NETWORK env is required");
  if (!Object.values(Network).includes(network as Network))
    throw Error(`NETWORK env must be one of ${Object.values(Network).join(", ")}`);

  const executionClientSelected = process.env[`_DAPPNODE_GLOBAL_EXECUTION_CLIENT_${network.toUpperCase()}`];
  if (!executionClientSelected)
    throw Error(`_DAPPNODE_GLOBAL_EXECUTION_CLIENT_${network.toUpperCase()} env is required`);
  const consensusClientSelected = process.env[`_DAPPNODE_GLOBAL_CONSENSUS_CLIENT_${network.toUpperCase()}`];
  if (!consensusClientSelected)
    throw Error(`_DAPPNODE_GLOBAL_CONSENSUS_CLIENT_${network.toUpperCase()} env is required`);
  const isMevBoostSet = process.env[`_DAPPNODE_GLOBAL_MEVBOOST_${network.toUpperCase()}`] === "true";
  const shareDataWithDappnode = process.env.SHARE_DATA_WITH_DAPPNODE === "true";

  return {
    network: network as Network,
    executionClientSelected,
    consensusClientSelected,
    isMevBoostSet,
    shareDataWithDappnode
  };
}

import { ConsensusClient, Network } from "@stakingbrain/common";
import fs from "fs";
import path from "path";

export const tlsCert = (consensusClient: ConsensusClient, network: Network): Buffer | null => {
  if (consensusClient !== ConsensusClient.Teku) return null;
  return fs.readFileSync(path.join("tls", network, "teku_client_keystore.p12"));
};

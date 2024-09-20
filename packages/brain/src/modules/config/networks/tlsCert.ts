import { ConsensusClient } from "@stakingbrain/common";
import fs from "fs";
import path from "path";

export const tlsCert = (consensusClient: ConsensusClient): Buffer | null => {
  if (consensusClient !== ConsensusClient.Teku) return null;
  return fs.readFileSync(path.join("tls", "mainnet", "teku_client_keystore.p12"));
};

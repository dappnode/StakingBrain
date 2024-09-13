import fs from "fs";
import path from "path";

export const tlsCert = (consensusClientSelected: string): Buffer | null => {
  if (!consensusClientSelected.includes("teku")) return null;
  return fs.readFileSync(path.join("tls", "mainnet", "teku_client_keystore.p12"));
};

import { StandardApi } from "./index.js";
import path from "path";
import {
  Network,
  DappnodeSigningProoverPostRequest,
} from "@stakingbrain/common";

export class DappnodeSigningProover extends StandardApi {
  private dappnodeSignEndpoint = "/newSignature";

  constructor(network: Network, validatorsMonitorUrl?: string) {
    super(
      {
        baseUrl: validatorsMonitorUrl || "https://dappnode-signatures.io",
      },
      network
    );
  }

  public async sendProofOfAttestation(
    proofOfAttestations: DappnodeSigningProoverPostRequest[]
  ): Promise<void> {
    await this.request({
      method: "POST",
      endpoint: path.join(this.dappnodeSignEndpoint),
      body: JSON.stringify(proofOfAttestations),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

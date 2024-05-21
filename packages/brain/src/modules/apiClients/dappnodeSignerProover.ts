import { StandardApi } from "./index.js";
import path from "path";
import {
  Network,
  DappnodeSigningProoverPostRequest,
} from "@stakingbrain/common";

export class DappnodeSigningProover extends StandardApi {
  private dappnodeSignEndpoint = "/signatures";

  constructor(network: Network, validatorsMonitorUrl?: string) {
    super(
      {
        baseUrl: validatorsMonitorUrl || "https://dappnode-signatures.io",
      },
      network
    );
  }

  public async sendProofsOfValidation(
    proofOfAttestations: DappnodeSigningProoverPostRequest[]
  ): Promise<void> {
    await this.request({
      method: "POST",
      endpoint: `${path.join(
        this.dappnodeSignEndpoint
      )}?network=${encodeURIComponent(this.network.toString())}`,
      body: JSON.stringify(proofOfAttestations),
      timeout: 10000,
    });
  }
}

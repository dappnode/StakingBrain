import { StandardApi } from "./index.js";
import {
  Network,
  DappnodeSignatureVerifierPostRequest,
} from "@stakingbrain/common";

export class DappnodeSignatureVerifier extends StandardApi {
  private dappnodeSignEndpoint = "/signatures";

  constructor(network: Network, validatorsMonitorUrl: string) {
    super(
      {
        baseUrl: validatorsMonitorUrl,
      },
      network
    );
  }

  public async sendProofsOfValidation(
    proofOfValidations: DappnodeSignatureVerifierPostRequest[]
  ): Promise<void> {
    await this.request({
      method: "POST",
      endpoint: `${this.dappnodeSignEndpoint}?network=${encodeURIComponent(
        this.network.toString()
      )}`,
      body: JSON.stringify(proofOfValidations),
      timeout: 10000,
    });
  }
}

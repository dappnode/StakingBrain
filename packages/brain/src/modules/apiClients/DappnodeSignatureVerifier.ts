import { StandardApi } from "./index.js";
import path from "path";
import {
  Network,
  DappnodeSignatureVerifierPostRequest,
} from "@stakingbrain/common";
import { params } from "../../params.js";

export class DappnodeSignatureVerifier extends StandardApi {
  private dappnodeSignEndpoint = "/signatures";

  constructor(network: Network, validatorsMonitorUrl?: string) {
    super(
      {
        baseUrl: validatorsMonitorUrl || params.defaultValidatorsMonitorUrl,
      },
      network
    );
  }

  public async sendProofsOfValidation(
    proofOfValidations: DappnodeSignatureVerifierPostRequest[]
  ): Promise<void> {
    await this.request({
      method: "POST",
      endpoint: `${path.join(
        this.dappnodeSignEndpoint
      )}?network=${encodeURIComponent(this.network.toString())}`,
      body: JSON.stringify(proofOfValidations),
      timeout: 10000,
    });
  }
}

import { StandardApi } from "./standard.js";
import path from "path";
import {
  Network,
  Web3signerPostSignDappnodeResponse,
} from "@stakingbrain/common";

const dappnodeSignDomain = "https://dappnode-signatures.io";

export class DappnodeSigningProover extends StandardApi {
  private dappnodeSignEndpoint = "/dappnode/proof-of-attestation";

  constructor(network: Network) {
    super(
      {
        baseUrl: dappnodeSignDomain,
      },
      network
    );
  }

  public async sendProofOfAttestation(
    proofOfAttestation: Web3signerPostSignDappnodeResponse
  ): Promise<void> {
    await this.request({
      method: "POST",
      endpoint: path.join(this.dappnodeSignEndpoint),
      body: { proofOfAttestation },
    });
  }
}

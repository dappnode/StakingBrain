import { expect } from "chai";
import sinon from "sinon";
import { ConsensusClient, ExecutionClient, Network } from "@stakingbrain/common";
import { loadEnvs } from "../../../../src/modules/config/loadEnvs.js";
import { networkConfig } from "../../../../src/modules/config/networks/index.js";

describe("Supported networks", () => {
  afterEach(() => sinon.restore());

  it("loads current networks and their chain parameters", () => {
    expect(Object.values(Network)).to.have.members(["mainnet", "gnosis", "lukso", "hoodi"]);
    for (const network of Object.values(Network)) {
      const stub = sinon.stub(process, "env").value({
        NETWORK: network,
        [`_DAPPNODE_GLOBAL_EXECUTION_CLIENT_${network.toUpperCase()}`]: "geth",
        [`_DAPPNODE_GLOBAL_CONSENSUS_CLIENT_${network.toUpperCase()}`]: "lighthouse"
      });
      expect(loadEnvs()).to.include({
        network,
        executionClient: ExecutionClient.Geth,
        consensusClient: ConsensusClient.Lighthouse
      });
      const config = networkConfig(network);
      expect(config.minGenesisTime).to.be.greaterThan(0);
      expect(config.secondsPerSlot).to.be.greaterThan(0);
      stub.restore();
    }
  });

  it("rejects retired testnets before resolving any client configuration", () => {
    for (const network of ["prater", "holesky", "goerli"]) {
      const stub = sinon.stub(process, "env").value({ NETWORK: network });
      expect(() => loadEnvs()).to.throw("NETWORK env must be one of mainnet, gnosis, lukso, hoodi");
      expect(() => networkConfig(network as Network)).to.throw("is not supported");
      stub.restore();
    }
  });
});

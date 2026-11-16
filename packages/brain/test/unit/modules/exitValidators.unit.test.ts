import { expect } from "chai";
import sinon from "sinon";
import { BeaconchainApi, Web3SignerApi } from "../../../src/modules/apiClients/index.js";
import { getExitValidators } from "../../../src/modules/apiServers/ui/calls/exitValidators.js";
import { BEACON_CHUNK_SIZE } from "../../../src/modules/beaconStatus/index.js";
import logger from "../../../src/modules/logger/index.js";

const pubkeyAt = (index: number) => "0x" + (index + 1).toString(16).padStart(96, "0");

describe("Validator exits for large selections", () => {
  let beacon: sinon.SinonStubbedInstance<BeaconchainApi>;
  let signer: sinon.SinonStubbedInstance<Web3SignerApi>;
  beforeEach(() => {
    sinon.stub(logger, "debug");
    beacon = sinon.createStubInstance(BeaconchainApi);
    signer = sinon.createStubInstance(Web3SignerApi);
    beacon.getEpochHeader.resolves(10);
    beacon.getForkFromState.resolves({
      data: { previous_version: "0x00", current_version: "0x01", epoch: "1" }
    } as never);
    beacon.getGenesis.resolves({
      data: { genesis_time: "0", genesis_validators_root: "0x" + "00".repeat(32), genesis_fork_version: "0x00" }
    } as never);
    signer.signVoluntaryExit.callsFake(async ({ pubkey }) => ({ signature: `sig-${pubkey}` }));
  });
  afterEach(() => sinon.restore());

  it("looks up indexes in bulk chunks and keeps the selection order", async () => {
    const pubkeys = Array.from({ length: 1200 }, (_, index) => pubkeyAt(index));
    beacon.postStateValidators.callsFake(
      async ({ body }) =>
        ({
          execution_optimistic: false,
          finalized: true,
          // The beacon API does not promise any order.
          data: [...body.ids].reverse().map((pubkey) => ({
            index: String(pubkeys.indexOf(pubkey)),
            balance: "0",
            status: "active_ongoing",
            validator: { pubkey: pubkey.toUpperCase().replace("0X", "0x") }
          }))
        }) as never
    );
    const exits = await getExitValidators({ beaconchainApi: beacon, signerApi: signer, pubkeys });
    expect(beacon.postStateValidators.getCalls().map(({ args }) => args[0].body.ids.length)).to.deep.equal([
      BEACON_CHUNK_SIZE,
      BEACON_CHUNK_SIZE,
      200
    ]);
    expect(beacon.getStateValidator.called).to.equal(false);
    // Signing follows the selection order, whatever order the beacon node answered in.
    expect(signer.signVoluntaryExit.getCalls().map(({ args }) => args[0].pubkey)).to.deep.equal(pubkeys);
    expect(exits.map(({ message }) => message.validator_index)).to.deep.equal(pubkeys.map((_, index) => String(index)));
  });

  it("refuses to exit when a validator is unknown to the beacon chain", async () => {
    const pubkeys = [pubkeyAt(0), pubkeyAt(1)];
    beacon.postStateValidators.resolves({
      execution_optimistic: false,
      finalized: true,
      data: [{ index: "0", validator: { pubkey: pubkeys[0] } }]
    } as never);
    const error = await getExitValidators({ beaconchainApi: beacon, signerApi: signer, pubkeys }).catch((e) => e);
    expect(error).to.be.instanceOf(Error).and.have.property("message").that.includes(pubkeys[1]);
    expect(signer.signVoluntaryExit.called).to.equal(false);
  });
});

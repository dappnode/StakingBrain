import { BeaconchainApi } from "../../../../../src/modules/apiClients/beaconchain/index.js";
import { expect } from "chai";
import { Network } from "@stakingbrain/common";
import { ApiParams, ValidatorStatus } from "../../../../../src/modules/apiClients/types.js";
import { BeaconchainApiError } from "../../../../../src/modules/apiClients/beaconchain/error.js";

describe.skip("Beaconchain API Tests", function () {
  let api: BeaconchainApi;
  const validatorIndexes = ["1802459", "1802425"];
  before(async function () {
    const apiParams: ApiParams = {
      baseUrl: "http://beacon-chain.holesky.dncore.dappnode:3500" // replace with actual API URL
    };

    api = new BeaconchainApi(apiParams, Network.Holesky); // Network matters for number of slots in epoch
  });

  // first call done in cron, to check what epoch to process
  it("should retrieve finality checkpoints for the head state", async function () {
    const checkpointsResponse = await api.getStateFinalityCheckpoints({ stateId: "head" });
    console.log("Finality Checkpoints Response:", checkpointsResponse);
    expect(checkpointsResponse).to.have.property("data");
  });

  it("should retrieve ids of validators in the finalized state that are active_ongoing", async function () {
    this.timeout(10000); // Set timeout to 10 seconds (10000 ms). This takes longer
    const response = await api.postStateValidators({
      body: {
        ids: validatorIndexes,
        statuses: [ValidatorStatus.ACTIVE_ONGOING]
      },
      stateId: "finalized"
    });
    console.log("Validator states for finalized state: ", response);
    const indexToCheck1 = "1802459"; // First index to check
    const indexToCheck2 = "1802425"; // Second index to check

    // Check if the data array contains the indices you are looking for
    const indicesInResponse = response.data.map((validator) => validator.index);

    expect(indicesInResponse).to.include(indexToCheck1);
    expect(indicesInResponse).to.include(indexToCheck2);
  });

  it("should be able to check if node is syncing", async function () {
    const { el_offline, is_syncing } = (await api.getSyncingStatus()).data;
    expect(el_offline).to.exist;
    expect(is_syncing).to.exist;
  });

  it("should retrieve the block header and derive epoch from slot", async function () {
    const blockHeaderResponse = await api.getBlockHeader({ blockId: "head" });
    console.log("Block Header Response:", blockHeaderResponse);
    expect(blockHeaderResponse).to.have.property("data");

    const epoch = await api.getEpochHeader({ blockId: "head" });
    console.log("Derived Epoch:", epoch);
    expect(epoch).to.be.a("number");
  });

  it("should retrieve attestation rewards & block proposal duties for a specific epoch", async function () {
    this.timeout(10000); // Set timeout to 10 seconds (10000 ms). This takes longer

    const epoch = await api.getStateFinalityCheckpoints({ stateId: "head" });
    const duties = await api.getProposerDuties({ epoch: epoch.data.finalized.epoch });

    // Assume we want to check the first duty slot
    const slotToCheck = duties.data[0]?.slot;

    if (slotToCheck) {
      try {
        // Attempt to retrieve the block header
        const blockHeaderResponse = await api.getBlockHeader({ blockId: slotToCheck });
        expect(blockHeaderResponse.data.header.message.proposer_index).to.exist; // Check for proposer_index if the request is successful
      } catch (error) {
        // Check if the error is a BeaconchainApiError
        expect(error).to.be.instanceOf(BeaconchainApiError); // Ensure it's the correct error type

        // Assert that the error message includes "404"
        expect(error.message).to.include("404");
        expect(error.message).to.include("Could not find requested block"); // check for specific message contents
      }
    } else {
      throw new Error("No slot available for duties data");
    }

    // Retrieve attestation rewards
    const rewardsResponse = await api.getAttestationsRewards({
      epoch: epoch.data.finalized.epoch,
      pubkeysOrIndexes: []
    });
    console.log("Attestation Rewards Response:", rewardsResponse);
    expect(rewardsResponse).to.have.property("data");
  });
});

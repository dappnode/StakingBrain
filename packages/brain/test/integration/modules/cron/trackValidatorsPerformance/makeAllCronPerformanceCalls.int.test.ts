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

    expect(checkpointsResponse).to.have.property("data");
    expect(checkpointsResponse.data).to.have.property("finalized");
    expect(checkpointsResponse.data.finalized).to.have.property("epoch");

    // Check that finalized.epoch exists and is a number (converted from string)
    const epoch = parseInt(checkpointsResponse.data.finalized.epoch, 10);
    expect(epoch).to.be.a("number");
    expect(epoch).to.not.be.NaN; // Ensure it's a valid number
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
    const indexToCheck1 = "1802459"; // First index to check
    const indexToCheck2 = "1802425"; // Second index to check

    // Check if the data array contains the indices you are looking for
    const indicesInResponse = response.data.map((validator) => validator.index);

    expect(indicesInResponse).to.include(indexToCheck1);
    expect(indicesInResponse).to.include(indexToCheck2);
  });

  it("should be able to check if node is syncing", async function () {
    const { el_offline, is_syncing } = (await api.getSyncingStatus()).data;

    // Check that both el_offline and is_syncing are booleans
    expect(el_offline).to.be.a("boolean");
    expect(is_syncing).to.be.a("boolean");
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
        expect(blockHeaderResponse.data.header.message.proposer_index).to.be.equal(duties.data[0].validator_index);
      } catch (error) {
        // Check if the error is a BeaconchainApiError
        expect(error).to.be.instanceOf(BeaconchainApiError); // Ensure it's the correct error type

        // Assert that the error message includes "404"
        expect(error.message).to.include("404");
      }
    } else {
      throw new Error("No slot available for duties data");
    }

    // Retrieve attestation rewards
    const rewardsResponse = await api.getAttestationsRewards({
      epoch: epoch.data.finalized.epoch,
      pubkeysOrIndexes: []
    });
    expect(rewardsResponse.data).to.have.property("total_rewards");
  });
});

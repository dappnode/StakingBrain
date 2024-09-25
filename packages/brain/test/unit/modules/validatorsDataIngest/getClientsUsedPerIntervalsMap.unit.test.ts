import { expect } from "chai";
import { getClientsUsedPerIntervalsMap } from "../../../../src/modules/validatorsDataIngest/getClientsUsedPerIntervalsMap.js";
import { ExecutionClient, ConsensusClient } from "@stakingbrain/common";
import { ValidatorPerformance, BlockProposalStatus } from "../../../../src/modules/apiClients/postgres/types.js";

describe("validatorsDataIngest - getClientsUsedPerIntervalsMap", () => {
  const validatorData: ValidatorPerformance[] = [
    {
      validatorIndex: 1,
      epoch: 0,
      executionClient: ExecutionClient.Geth,
      consensusClient: ConsensusClient.Teku,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "1",
        head: "head1",
        target: "target1",
        source: "source1",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 2,
      epoch: 1,
      executionClient: ExecutionClient.Besu,
      consensusClient: ConsensusClient.Prysm,
      blockProposalStatus: BlockProposalStatus.Missed,
      attestationsTotalRewards: {
        validator_index: "2",
        head: "head2",
        target: "target2",
        source: "source2",
        inclusion_delay: "1",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 3,
      epoch: 1,
      executionClient: ExecutionClient.Geth,
      consensusClient: ConsensusClient.Lighthouse,
      blockProposalStatus: BlockProposalStatus.Unchosen,
      attestationsTotalRewards: {
        validator_index: "3",
        head: "head3",
        target: "target3",
        source: "source3",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 4,
      epoch: 2,
      executionClient: ExecutionClient.Erigon,
      consensusClient: ConsensusClient.Nimbus,
      blockProposalStatus: BlockProposalStatus.Error,
      attestationsTotalRewards: {
        validator_index: "4",
        head: "head4",
        target: "target4",
        source: "source4",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 5,
      epoch: 1,
      executionClient: ExecutionClient.Geth,
      consensusClient: ConsensusClient.Teku,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "5",
        head: "head5",
        target: "target5",
        source: "source5",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 6,
      epoch: 2,
      executionClient: ExecutionClient.Geth,
      consensusClient: ConsensusClient.Teku,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "6",
        head: "head6",
        target: "target6",
        source: "source6",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 7,
      epoch: 2,
      executionClient: ExecutionClient.Besu,
      consensusClient: ConsensusClient.Prysm,
      blockProposalStatus: BlockProposalStatus.Missed,
      attestationsTotalRewards: {
        validator_index: "7",
        head: "head7",
        target: "target7",
        source: "source7",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 8,
      epoch: 3,
      executionClient: ExecutionClient.Besu,
      consensusClient: ConsensusClient.Lighthouse,
      blockProposalStatus: BlockProposalStatus.Unchosen,
      attestationsTotalRewards: {
        validator_index: "8",
        head: "head8",
        target: "target8",
        source: "source8",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 9,
      epoch: 3,
      executionClient: ExecutionClient.Geth,
      consensusClient: ConsensusClient.Nimbus,
      blockProposalStatus: BlockProposalStatus.Error,
      attestationsTotalRewards: {
        validator_index: "9",
        head: "head9",
        target: "target9",
        source: "source9",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 10,
      epoch: 4,
      executionClient: ExecutionClient.Erigon,
      consensusClient: ConsensusClient.Teku,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "10",
        head: "head10",
        target: "target10",
        source: "source10",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 11,
      epoch: 4,
      executionClient: ExecutionClient.Besu,
      consensusClient: ConsensusClient.Prysm,
      blockProposalStatus: BlockProposalStatus.Missed,
      attestationsTotalRewards: {
        validator_index: "11",
        head: "head11",
        target: "target11",
        source: "source11",
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 12,
      epoch: 4,
      executionClient: ExecutionClient.Geth,
      consensusClient: ConsensusClient.Teku,
      blockProposalStatus: BlockProposalStatus.Unchosen,
      attestationsTotalRewards: {
        validator_index: "12",
        head: "head12",
        target: "target12",
        source: "source12",
        inclusion_delay: "0",
        inactivity: "0"
      }
    }
  ];

  it("should return correct counts for a given epoch range", () => {
    const startEpoch = 1;
    const endEpoch = 4;

    const result = getClientsUsedPerIntervalsMap({ validatorData, startEpoch, endEpoch });
    expect(result.size).to.equal(7); // Geth-Teku, Besu-Prysm, Geth-Lighthouse, Erigon-Teku
    expect(result.get(`${ExecutionClient.Geth}-${ConsensusClient.Teku}`)).to.equal(2);
    expect(result.get(`${ExecutionClient.Besu}-${ConsensusClient.Prysm}`)).to.equal(2);
    expect(result.get(`${ExecutionClient.Geth}-${ConsensusClient.Lighthouse}`)).to.equal(1);
    expect(result.get(`${ExecutionClient.Erigon}-${ConsensusClient.Nimbus}`)).to.equal(1);
    expect(result.get(`${ExecutionClient.Geth}-${ConsensusClient.Nimbus}`)).to.equal(1);
    expect(result.get(`${ExecutionClient.Erigon}-${ConsensusClient.Teku}`)).to.equal(0);
  });

  it("should return zero counts for an epoch range with no data", () => {
    const startEpoch = 12;
    const endEpoch = 15;

    const result = getClientsUsedPerIntervalsMap({ validatorData, startEpoch, endEpoch });
    for (const value of result.values()) expect(value).to.equal(0);
  });

  it("should handle cases where startEpoch is equal to endEpoch. Nothing should be displayed since the intervals takes the first epoch and not the last one", () => {
    const startEpoch = 1;
    const endEpoch = 1;

    const result = getClientsUsedPerIntervalsMap({ validatorData, startEpoch, endEpoch });
    for (const value of result.values()) expect(value).to.equal(0);
  });
});

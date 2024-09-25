import { expect } from "chai";
import { getAttestationSuccessRatePerClients } from "../../../../src/modules/validatorsDataIngest/getAttestationSuccessRatePerClients.js";
import { ExecutionClient, ConsensusClient } from "@stakingbrain/common";
import { ValidatorPerformance, BlockProposalStatus } from "../../../../src/modules/apiClients/postgres/types.js";

describe("validatorsDataIngest - getAttestationSuccessRatePerClients", () => {
  // Sample validator data
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
        source: "0", // Successful attestation
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 1,
      epoch: 1,
      executionClient: ExecutionClient.Geth,
      consensusClient: ConsensusClient.Teku,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "1",
        head: "head2",
        target: "target2",
        source: "-1", // Failed attestation
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 1,
      epoch: 2,
      executionClient: ExecutionClient.Geth,
      consensusClient: ConsensusClient.Teku,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "1",
        head: "head3",
        target: "target3",
        source: "1", // Successful attestation
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 2,
      epoch: 0,
      executionClient: ExecutionClient.Besu,
      consensusClient: ConsensusClient.Prysm,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "2",
        head: "head1",
        target: "target1",
        source: "0", // Successful attestation
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 2,
      epoch: 1,
      executionClient: ExecutionClient.Besu,
      consensusClient: ConsensusClient.Prysm,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "2",
        head: "head2",
        target: "target2",
        source: "0", // Successful attestation
        inclusion_delay: "0",
        inactivity: "0"
      }
    },
    {
      validatorIndex: 2,
      epoch: 2,
      executionClient: ExecutionClient.Besu,
      consensusClient: ConsensusClient.Prysm,
      blockProposalStatus: BlockProposalStatus.Proposed,
      attestationsTotalRewards: {
        validator_index: "2",
        head: "head3",
        target: "target3",
        source: "-1", // Failed attestation
        inclusion_delay: "0",
        inactivity: "0"
      }
    }
  ];

  it("should calculate the attestation success rate per clients correctly", () => {
    const startEpoch = 0;
    const endEpoch = 3; // Covering epochs 0, 1, and 2

    const result = getAttestationSuccessRatePerClients({
      validatorData,
      startEpoch,
      endEpoch
    });

    // Check success rates for Geth-Teku
    expect(result.get(`${ExecutionClient.Geth}-${ConsensusClient.Teku}`)).to.equal(67); // 2 successful out of 3

    // Check success rates for Besu-Prysm
    expect(result.get(`${ExecutionClient.Besu}-${ConsensusClient.Prysm}`)).to.equal(67); // 2 successful out of 3
  });

  it("should return 0% success rate if there are no opportunities", () => {
    const startEpoch = 3;
    const endEpoch = 3; // No opportunities

    const result = getAttestationSuccessRatePerClients({
      validatorData,
      startEpoch,
      endEpoch
    });

    expect(result.get(`${ExecutionClient.Geth}-${ConsensusClient.Teku}`)).to.equal(0); // No opportunities
    expect(result.get(`${ExecutionClient.Besu}-${ConsensusClient.Prysm}`)).to.equal(0); // No opportunities
  });

  it("should handle a scenario where there are no successful attestations", () => {
    const validatorDataNoSuccess: ValidatorPerformance[] = [
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
          source: "-1", // Failed attestation
          inclusion_delay: "0",
          inactivity: "0"
        }
      },
      {
        validatorIndex: 1,
        epoch: 1,
        executionClient: ExecutionClient.Geth,
        consensusClient: ConsensusClient.Teku,
        blockProposalStatus: BlockProposalStatus.Proposed,
        attestationsTotalRewards: {
          validator_index: "1",
          head: "head2",
          target: "target2",
          source: "-1", // Failed attestation
          inclusion_delay: "0",
          inactivity: "0"
        }
      }
    ];

    const startEpoch = 0;
    const endEpoch = 2; // Covering epochs 0 and 1

    const result = getAttestationSuccessRatePerClients({
      validatorData: validatorDataNoSuccess,
      startEpoch,
      endEpoch
    });

    expect(result.get(`${ExecutionClient.Geth}-${ConsensusClient.Teku}`)).to.equal(0); // No successful attestations
  });
});

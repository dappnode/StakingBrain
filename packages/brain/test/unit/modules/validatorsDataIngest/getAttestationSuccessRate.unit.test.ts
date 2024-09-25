import { ExecutionClient, ConsensusClient } from "@stakingbrain/common";
import { expect } from "chai";
import { ValidatorPerformance, BlockProposalStatus } from "../../../../src/modules/apiClients/postgres/types.js";
import { getAttestationSuccessRate } from "../../../../src/modules/validatorsDataIngest/getAttestationSuccessRate";

describe("validatorsDataIngest - getAttestationSuccessRate", () => {
  it("should return the attestation success rate for a given validator", () => {
    const validatorData: ValidatorPerformance[] = [
      {
        validatorIndex: 0,
        epoch: 1,
        executionClient: ExecutionClient.Geth,
        consensusClient: ConsensusClient.Lighthouse,
        blockProposalStatus: BlockProposalStatus.Proposed,
        attestationsTotalRewards: {
          validator_index: "0",
          head: "someHead",
          target: "someTarget",
          source: "1",
          inclusion_delay: "0",
          inactivity: "0"
        }
      },
      {
        validatorIndex: 0,
        epoch: 2,
        executionClient: ExecutionClient.Geth,
        consensusClient: ConsensusClient.Lighthouse,
        blockProposalStatus: BlockProposalStatus.Proposed,
        attestationsTotalRewards: {
          validator_index: "0",
          head: "someHead",
          target: "someTarget",
          source: "0",
          inclusion_delay: "0",
          inactivity: "0"
        }
      },
      {
        validatorIndex: 0,
        epoch: 3,
        executionClient: ExecutionClient.Geth,
        consensusClient: ConsensusClient.Lighthouse,
        blockProposalStatus: BlockProposalStatus.Proposed,
        attestationsTotalRewards: {
          validator_index: "0",
          head: "someHead",
          target: "someTarget",
          source: "-1",
          inclusion_delay: "0",
          inactivity: "0"
        }
      }
    ];

    const startEpoch = 1;
    const endEpoch = 4; // Total opportunities: 3 (1, 2, 3)

    const successRate = getAttestationSuccessRate({
      validatorData,
      startEpoch,
      endEpoch
    });

    expect(successRate).to.equal(67); // 2 successful attestations out of 3 opportunities
  });

  it("should return 0 if the total attestation opportunities are less than or equal to 0", () => {
    const validatorData: ValidatorPerformance[] = [];
    const startEpoch = 3;
    const endEpoch = 3; // Total opportunities: 0

    const successRate = getAttestationSuccessRate({
      validatorData,
      startEpoch,
      endEpoch
    });

    expect(successRate).to.equal(0);
  });

  it("should correctly handle edge case with no successful attestations", () => {
    const validatorData: ValidatorPerformance[] = [
      {
        validatorIndex: 0,
        epoch: 1,
        executionClient: ExecutionClient.Geth,
        consensusClient: ConsensusClient.Lighthouse,
        blockProposalStatus: BlockProposalStatus.Proposed,
        attestationsTotalRewards: {
          validator_index: "0",
          head: "someHead",
          target: "someTarget",
          source: "-1", // Unsuccessful
          inclusion_delay: "0",
          inactivity: "0"
        }
      }
    ];

    const startEpoch = 1;
    const endEpoch = 2; // Total opportunities: 1

    const successRate = getAttestationSuccessRate({
      validatorData,
      startEpoch,
      endEpoch
    });

    expect(successRate).to.equal(0); // No successful attestations
  });
});

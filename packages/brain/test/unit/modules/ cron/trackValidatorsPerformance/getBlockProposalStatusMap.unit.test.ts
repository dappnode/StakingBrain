import { expect } from "chai";
import { BeaconchainApi } from "../../../../../src/modules/apiClients/index.js";
import type {
  BeaconchainBlockHeaderGetResponse,
  BeaconchainProposerDutiesGetResponse,
  BlockId,
  ValidatorsDataPerEpochMap
} from "../../../../../src/modules/apiClients/types.js";
import { BlockProposalStatus } from "../../../../../src/modules/apiClients/postgres/types.js";
import { ConsensusClient, ExecutionClient, Network } from "@stakingbrain/common";
import { setBlockProposalStatus } from "../../../../../src/modules/cron/trackValidatorsPerformance/setBlockProposalStatus.js";

// validator index 1802289 is supposed to propose in slot 1
// validator index 1802291 is supposed to propose in slot 2
// validator index 1802292 is not supposed to propose in any slot
const validatorsBlockProposal: {
  index: string;
  slot: string;
}[] = [
  {
    index: "1802289",
    slot: "1"
  },
  {
    index: "1802291",
    slot: "2"
  },
  {
    index: "1802292",
    slot: ""
  }
];

const validatorMissedBlockProposal = {
  index: "1802283",
  slot: "3"
};

class BeaconchainApiMock extends BeaconchainApi {
  async getProposerDuties({ epoch }: { epoch: string }): Promise<BeaconchainProposerDutiesGetResponse> {
    console.log(`epoch: ${epoch}`);
    return {
      dependent_root: "",
      execution_optimistic: false,
      data: [
        {
          pubkey: "",
          validator_index: validatorsBlockProposal[0].index,
          slot: validatorsBlockProposal[0].slot
        },
        {
          pubkey: "",
          validator_index: validatorsBlockProposal[1].index,
          slot: validatorsBlockProposal[1].slot
        },
        {
          pubkey: "",
          validator_index: validatorMissedBlockProposal.index,
          slot: validatorMissedBlockProposal.slot
        }
      ]
    };
  }

  async getBlockHeader({ blockId }: { blockId: BlockId }): Promise<BeaconchainBlockHeaderGetResponse> {
    console.log(`blockId: ${blockId}`);

    // find in the validatorsBlockProposal array the slot that matches the blockId if not found reject with an error with code 404
    const foundValidator = validatorsBlockProposal.find((validator) => validator.slot === blockId);
    if (!foundValidator) return Promise.reject({ status: 404 });
    return {
      execution_optimistic: true,
      data: {
        root: "",
        canonical: true,
        header: {
          message: {
            slot: foundValidator.slot,
            proposer_index: foundValidator.index,
            parent_root: "",
            state_root: "",
            body_root: ""
          },
          signature: ""
        }
      }
    };
  }
}

describe("Cron - trackValidatorsPerformance - getBlockProposalStatusMap", () => {
  const beaconchainApi = new BeaconchainApiMock({ baseUrl: "http://localhost:3000" }, Network.Mainnet);

  it("should return the block proposal status of each validator: ", async () => {
    const epoch = "1";
    const validatorsDataPerEpochMap: ValidatorsDataPerEpochMap = new Map(
      validatorsBlockProposal.map((validator) => [
        validator.index,
        {
          clients: { execution: ExecutionClient.Geth, consensus: ConsensusClient.Lighthouse },
          block: { status: BlockProposalStatus.Unchosen }
        }
      ])
    );
    await setBlockProposalStatus({
      beaconchainApi,
      epoch,
      validatorsDataPerEpochMap
    });

    const validator0Data = validatorsDataPerEpochMap.get(validatorsBlockProposal[0].index);
    if (!validator0Data?.block) throw new Error("validator0Data is undefined");
    expect(validator0Data.block.status).to.equal(BlockProposalStatus.Proposed);
    const validator1Data = validatorsDataPerEpochMap.get(validatorsBlockProposal[1].index);
    if (!validator1Data?.block) throw new Error("validator1Data is undefined");
    expect(validator1Data.block.status).to.equal(BlockProposalStatus.Proposed);
    const validator2Data = validatorsDataPerEpochMap.get(validatorsBlockProposal[2].index);
    if (!validator2Data?.block) throw new Error("validator2Data is undefined");
    expect(validator2Data.block.status).to.equal(BlockProposalStatus.Unchosen);
  });
});

import { expect } from "chai";
import { BeaconchainApi } from "../../../../../src/modules/apiClients/index.js";
import {
  BeaconchainValidatorFromStateGetResponse,
  BeaconchainValidatorStatePostResponse,
  BlockId,
  ValidatorStatus
} from "../../../../../src/modules/apiClients/types.js";
import { BrainDataBase } from "../../../../../src/modules/db/index.js";
import { StakingBrainDb } from "../../../../../src/modules/db/types.js";
import { getActiveValidatorsLoadedInBrain } from "../../../../../src/modules/cron/trackValidatorsPerformance/getActiveValidatorsLoadedInBrain.js";
import { Network } from "@stakingbrain/common";

const validators: { pubkey: string; index: number }[] = [
  {
    pubkey: "0x86531f35f71730767e72692442a2020a6f252c15bc73d11e201d658ed90dde0dd15d9614e6c115b2dd0221ce35dcdcb3",
    index: 1802289
  },
  {
    pubkey: "0x86531f35f71730767e72692442a2020a6f252c15bc73d11e201d658ed90dde0dd15d9614e6c115b2dd0221ce35dcdcb4",
    index: 1802291
  }
];

const validatorIndexOne = 1802289;
const pubkeyOne = "0x86531f35f71730767e72692442a2020a6f252c15bc73d11e201d658ed90dde0dd15d9614e6c115b2dd0221ce35dcdcb3";
const validatorIndexTwo = 1802291;
const pubkeyTwo = "0x86531f35f71730767e72692442a2020a6f252c15bc73d11e201d658ed90dde0dd15d9614e6c115b2dd0221ce35dcdcb4";

// Create class mock that implements BeaconchainApi and overwrites the method postStateValidators
class BeaconchainApiMock extends BeaconchainApi {
  async getStateValidator({
    state,
    pubkey
  }: {
    state: BlockId;
    pubkey: string;
  }): Promise<BeaconchainValidatorFromStateGetResponse> {
    console.log(`state: ${state}, pubkey: ${pubkey}`);
    if (pubkey === pubkeyOne)
      return {
        execution_optimistic: false,
        data: {
          index: validatorIndexOne.toString(),
          balance: "0",
          status: ValidatorStatus.ACTIVE_EXITING,
          validator: {
            pubkey: pubkeyOne,
            withdrawal_credentials: "",
            effective_balance: "",
            slashed: false,
            activation_eligibility_epoch: "",
            activation_epoch: "",
            exit_epoch: "",
            withdrawable_epoch: ""
          }
        }
      };
    if (pubkey === pubkeyTwo)
      return {
        execution_optimistic: false,
        data: {
          index: validatorIndexTwo.toString(),
          balance: "0",
          status: ValidatorStatus.ACTIVE_EXITING,
          validator: {
            pubkey: pubkeyTwo,
            withdrawal_credentials: "",
            effective_balance: "",
            slashed: false,
            activation_eligibility_epoch: "",
            activation_epoch: "",
            exit_epoch: "",
            withdrawable_epoch: ""
          }
        }
      };
    throw new Error("pubkey not found");
  }

  async postStateValidators({
    stateId,
    body
  }: {
    stateId: BlockId;
    body: { ids: string[]; statuses: ValidatorStatus[] };
  }): Promise<BeaconchainValidatorStatePostResponse> {
    console.log(`stateId: ${stateId}, body: ${JSON.stringify(body)}`);
    return {
      execution_optimistic: false,
      finalized: true,
      data: validators.map((validator) => ({
        index: validator.index.toString(),
        balance: "0",
        status: ValidatorStatus.ACTIVE_ONGOING,
        validator: {
          pubkey: validator.pubkey,
          withdrawal_credentials: "",
          effective_balance: "",
          slashed: false,
          activation_eligibility_epoch: "",
          activation_epoch: "",
          exit_epoch: "",
          withdrawable_epoch: ""
        }
      }))
    };
  }
}

// Mock the BrainDataBase class
class BrainDataBaseMock extends BrainDataBase {
  data: StakingBrainDb = {
    [pubkeyOne]: {
      tag: "obol",
      feeRecipient: "0x52908400098527886E0F7030069857D2E4169EE7",
      automaticImport: true,
      index: validatorIndexOne // validator index exists
    },
    [pubkeyTwo]: {
      tag: "solo",
      feeRecipient: "0x52908400098527886E0F7030069857D2E4169EE6",
      automaticImport: true
      // validator index does not exist
    }
  };

  getData() {
    return this.data;
  }

  updateValidators({ validators }: { validators: StakingBrainDb }) {
    this.data = { ...this.data, ...validators };
  }
}

describe("Cron - trackValidatorsPerformance - getActiveValidatorsLoadedInBrain", () => {
  it("should return the active validators loaded in the brain and not update validator index one and update validator index two in db", async () => {
    const beaconchainApi = new BeaconchainApiMock(
      { baseUrl: "http://localhost:3000", apiPath: "", authToken: "" },
      Network.Holesky
    );
    const brainDb = new BrainDataBaseMock("test.json");

    const activeValidatorsIndexes = await getActiveValidatorsLoadedInBrain({
      beaconchainApi,
      brainDb
    });

    expect(activeValidatorsIndexes).to.be.an("array").that.includes(validatorIndexOne.toString());
    expect(activeValidatorsIndexes).to.be.an("array").that.includes(validatorIndexTwo.toString());
    expect(activeValidatorsIndexes.length).to.be.equal(2);
    expect(brainDb.getData()[pubkeyOne].index).to.be.equal(validatorIndexOne);
    expect(brainDb.getData()[pubkeyTwo].index).to.be.equal(validatorIndexTwo);
  });
});

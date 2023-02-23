import { Wizard } from "@blockswaplab/wizard";
import { burnAddress } from "@stakingbrain/common";
import { ethers } from "ethers";

export class StakeHouseSDK {
  constructor() {
    console.log("StakeHouseSDK constructor");
  }

  async getLsdFeeRecipient(pubkey: string): Promise<string> {
    //TODO

    //wizard.helper.getValidatorDetails(pubkey).feeRecipient

    return burnAddress;
  }
}

import { Wizard } from "@blockswaplab/lsd-wizard";
import { executionClientUrl } from "../../../index.js";
import { getDefaultProvider } from "ethers";
import { ValidatorDetails } from "./types.js";

export class StakeHouseSDK {
  wizard: Wizard;

  constructor() {
    const provider = getDefaultProvider(executionClientUrl);
    this.wizard = new Wizard({ signerOrProvider: provider });
  }

  async getLsdFeeRecipient(pubkey: string): Promise<string> {
    const validatorDetails: ValidatorDetails | undefined =
      await this.wizard.helper.getValidatorDetails(pubkey);

    if (!validatorDetails || !validatorDetails.feeRecipient)
      throw new Error(
        `Cannot get StakeHouse fee recipient for pubkey ${pubkey}: Not found. 
          Your execution or consensus clients might be out of sync. 
          Also, check that the pubkey you entered corresponds to a validator registered in StakeHouse`
      );

    return validatorDetails.feeRecipient;
  }
}

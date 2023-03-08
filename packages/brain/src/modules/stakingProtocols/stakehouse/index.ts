//import { Wizard } from "@blockswaplab/lsd-wizard/config.mjs";
//import { Network } from "@stakingbrain/common";

export class StakeHouseSDK {
  /*wizard: Wizard; 

  constructor(network: Omit<Network, "gnosis">) {
    const provider = 
  }*/

  async getLsdFeeRecipient(pubkey: string): Promise<string> {
    //TODO

    throw new Error(
      `Cannot get StakeHouse fee recipient for pubkey ${pubkey}: Not implemented`
    );
  }
}

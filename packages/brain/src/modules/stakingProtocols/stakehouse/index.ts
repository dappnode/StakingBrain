import { Wizard } from "@blockswaplab/lsd-wizard";
import { executionClientUrl, network } from "../../../index.js";
import { providers } from "ethers";
import { ValidatorDetails } from "./types.js";
import { shortenPubkey } from "@stakingbrain/common";

export class StakeHouseSDK {
  wizard: Wizard;

  constructor() {
    if (network == "gnosis") {
      throw new Error("StakeHouse is not supported on Gnosis chain");
    }

    const rpcNetwork: providers.Network =
      network == "mainnet"
        ? {
            name: "mainnet",
            chainId: 1,
          }
        : {
            name: "goerli",
            chainId: 5,
          };

    const provider = new providers.JsonRpcProvider(
      executionClientUrl,
      rpcNetwork
    );
    this.wizard = new Wizard({ signerOrProvider: provider });
  }

  async getLsdFeeRecipient(pubkey: string): Promise<string> {
    const validatorDetails: ValidatorDetails | undefined =
      await this.wizard.helper.getValidatorDetails(pubkey);

    if (!validatorDetails || !validatorDetails.feeRecipient)
      throw new Error(
        `Cannot get StakeHouse fee recipient for pubkey ${shortenPubkey(
          pubkey
        )}. Your execution or consensus clients might be out of sync or the pubkey you entered does not correspond to a validator registered in StakeHouse.`
      );

    return validatorDetails.feeRecipient;
  }
}

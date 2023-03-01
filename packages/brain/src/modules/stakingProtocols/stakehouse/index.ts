export class StakeHouseSDK {
  async getLsdFeeRecipient(pubkey: string): Promise<string> {
    //TODO

    throw new Error(
      `Cannot get StakeHouse fee recipient for pubkey ${pubkey}: Not implemented`
    );
  }
}

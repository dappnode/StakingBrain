import { StandardApi } from "../index.js";
import {
  Web3signerGetResponse,
  BeaconchaGetResponse,
} from "@stakingbrain/common";

const maxValidatorsPerRequest = 100; //For beaconcha.in --> TODO: is it the same for Gnosis?

export class BeaconchaApi extends StandardApi {
  /*
   * Fetch info for every validator PK
   */
  public async fetchAllValidatorsInfo({
    keystoresGet,
  }: {
    keystoresGet: Web3signerGetResponse;
  }): Promise<BeaconchaGetResponse[]> {
    const validatorsInfo = new Array<BeaconchaGetResponse>();

    const allValidatorPKs = keystoresGet.data.map(
      (keystoreData) => keystoreData.validating_pubkey
    );

    const chunkSize = maxValidatorsPerRequest;

    for (let i = 0; i < allValidatorPKs.length; i += chunkSize) {
      const chunk = allValidatorPKs.slice(i, i + chunkSize);
      const chunkResponse = await this.fetchValidatorsInfo(chunk);
      validatorsInfo.push(chunkResponse);
    }

    //validatorInfo.data is an array only if there are multiple validators
    // (Beaconcha.in response works like this)
    validatorsInfo.forEach((validatorChunk) => {
      //Check if validatorChunk.data is an array
      if (!Array.isArray(validatorChunk.data)) {
        validatorChunk.data = [validatorChunk.data];
      }
    });

    return validatorsInfo;
  }

  /**
   * Get validator indexes for a list of public keys
   * https://beaconcha.in/api/v1/docs/index.html#/Validator/get_api_v1_validator__indexOrPubkey_
   */
  public async fetchValidatorsInfo(
    pubkeys: string[]
  ): Promise<BeaconchaGetResponse> {
    const fullUrl = `${this.baseUrl}${
      this.keymanagerEndpoint
    }validator/${pubkeys.join(",")}`;

    try {
      return (await this.request("GET", fullUrl)) as BeaconchaGetResponse;
    } catch (e) {
      return {
        status: "error",
        data: [],
        error: {
          message: e.message,
        },
      };
    }
  }
}

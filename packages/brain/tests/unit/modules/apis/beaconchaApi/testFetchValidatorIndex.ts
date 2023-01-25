import { BeaconchaApi } from "../../../../../src/modules/apis/beaconchaApi";
import { expect } from "chai";
import { networkTestMap } from "./networkTestMap";
import { Web3signerGetResponse } from "@stakingbrain/common";
import { beaconchaApiParamsMap } from "../../../../../../ui/src/params";
require("isomorphic-fetch");

describe("Test for fetching validator indexes in every available network", () => {
  it("should return data corresponding to every validator PK", async () => {
    const networks = ["mainnet", "prater", "gnosis"];

    for (const network of networks) {
      console.log("NETWORK: ", network);

      const keystoresGet = {
        status: "ok",
        data: [
          {
            validating_pubkey: networkTestMap.get(network)!.pubkeys[0],
            derivation_path: "",
            readonly: false,
          },
          {
            validating_pubkey: networkTestMap.get(network)!.pubkeys[1],
            derivation_path: "",
            readonly: false,
          },
        ],
      } as Web3signerGetResponse;

      const beaconchaApi = new BeaconchaApi(
        beaconchaApiParamsMap.get(network)!
      );

      const allValidatorsInfo = await beaconchaApi.fetchAllValidatorsInfo({
        keystoresGet,
      });

      expect(allValidatorsInfo[0].data[0].validatorindex).to.equal(
        networkTestMap.get(network)!.indexes[0]
      );
      expect(allValidatorsInfo[0].data[1].validatorindex).to.equal(
        networkTestMap.get(network)!.indexes[1]
      );
    }
  });
});

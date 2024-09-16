import { expect } from "chai";
import { Network } from "@stakingbrain/common";
import { BlockExplorerApi } from "../../../../src/modules/apiClients";
import { ApiParams } from "../../../../src/modules/apiClients/types.js";

describe.skip("Test for fetching validator indexes in every available network", () => {
  const networks: Network[] = [Network.Mainnet, Network.Gnosis, Network.Lukso, Network.Holesky];

  networks.forEach((network) => {
    it(`should return data corresponding to every validator PK for ${network}`, async () => {
      const apiParams = beaconchaApiParamsMap.get(network);
      if (!apiParams) {
        throw new Error(`API parameters for ${network} are not defined`);
      }

      const beaconchaApi = new BlockExplorerApi(apiParams, network);
      const testParams = networkTestMap.get(network);
      if (!testParams) {
        throw new Error(`Test parameters for ${network} are not defined`);
      }

      const allValidatorsInfo = await beaconchaApi.fetchAllValidatorsInfo({
        pubkeys: testParams.pubkeys
      });

      // Assuming allValidatorsInfo[0].data contains an array of validators
      const validators = allValidatorsInfo[0].data;

      // This loop assumes that the API returns validators in the same order as requested.
      // If this assumption is not valid, additional logic is needed to match returned validators to expected values.
      testParams.pubkeys.forEach((pubkey, index) => {
        const validator = validators.find((v) => v.pubkey === pubkey);
        if (!validator) {
          throw new Error(`Validator with pubkey ${pubkey} not found for ${network}`);
        }
        expect(validator.validatorindex).to.equal(testParams.indexes[index]);
      });
    });
  });
});

const networkTestMap = new Map<string, { pubkeys: string[]; indexes: number[] }>([
  [
    "mainnet",
    {
      pubkeys: [
        "0x80000001677f23a227dfed6f61b132d114be83b8ad0aa5f3c5d1d77e6ee0bf5f73b0af750cc34e8f2dae73c21dc36f4a",
        "0x800006d4b1026b6149168b342e6883d48ede9539202cc414448b1b796394440a5401e8d6620e65d7c77654bf1db199b1"
      ],
      indexes: [8499, 347967]
    }
  ],
  [
    "gnosis",
    {
      pubkeys: [
        "0x8000385f61788781c3514322c14bf4ef51bfee5ed743872ac9ea37a3a11e1e3496f4f5e252ef33fdb5bf3684c13ed210",
        "0x8000e5f66ffb58ef1f8bf8994172da85c77142cc7be24a63d53e572f5ba1149466c5aa0e6a383b2cddf83467cf8e688a"
      ],
      indexes: [57102, 81200]
    }
  ],
  [
    "lukso",
    {
      pubkeys: [
        "0x8000460289c3435bb6af636314142aed624089edb56dc12fc91475176592067ae4216bfe95b651c3af7c1c491a519134",
        "0x80012f0aaa40e9cccf47ea7255ec380976d32c9e92fec0701926d9457e9510d108ae8fd5bea82bf13b85cc82de2729ac"
      ],
      indexes: [24693, 4272]
    }
  ],
  [
    "holesky",
    {
      pubkeys: [
        "0x800000b3884235f70b06fec68c19642fc9e81e34fbe7f1c0ae156b8b45860dfe5ac71037ae561c2a759ba83401488e18",
        "0x800009f644592de8d2de0da0caca00f26fd6fb3d7f99f57101bbbfb45d4b166f8dbe5fd82b3611e6e90fe323de955bd2"
      ],
      indexes: [886680, 68945]
    }
  ]
]);

// TODO: move below to common

const beaconchaApiParamsMap = new Map<string, ApiParams>([
  [
    "mainnet",
    {
      baseUrl: "https://beaconcha.in",
      apiPath: "/api/v1/"
    }
  ],
  [
    "gnosis",
    {
      baseUrl: "https://gnosischa.in",
      apiPath: "/api/v1/"
    }
  ],
  [
    "lukso",
    {
      baseUrl: "https://explorer.consensus.mainnet.lukso.network",
      apiPath: "/api/v1/"
    }
  ],
  [
    "holesky",
    {
      baseUrl: "https://holesky.beaconcha.in",
      apiPath: "/api/v1/"
    }
  ]
]);

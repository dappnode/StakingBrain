import { expect } from "chai";
import { ApiParams, Network } from "@stakingbrain/common";
import { BeaconchaApi } from "../../../../src/modules/apiClients/beaconcha/index.js";

describe("Test for fetching validator indexes in every available network", () => {
  it("should return data corresponding to every validator PK", async () => {
    const networks: Network[] = ["mainnet", "prater", "gnosis", "lukso", "holesky"];

    for (const network of networks) {
      console.log("NETWORK: ", network);

      const beaconchaApi = new BeaconchaApi(
        beaconchaApiParamsMap.get(network)!,
        network
      );

      const allValidatorsInfo = await beaconchaApi.fetchAllValidatorsInfo({
        pubkeys: [
          networkTestMap.get(network)!.pubkeys[0],
          networkTestMap.get(network)!.pubkeys[1],
        ],
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

const networkTestMap = new Map<
  string,
  { pubkeys: string[]; indexes: number[] }
>([
  [
    "mainnet",
    {
      pubkeys: [
        "0x80000001677f23a227dfed6f61b132d114be83b8ad0aa5f3c5d1d77e6ee0bf5f73b0af750cc34e8f2dae73c21dc36f4a",
        "0x800006d4b1026b6149168b342e6883d48ede9539202cc414448b1b796394440a5401e8d6620e65d7c77654bf1db199b1",
      ],
      indexes: [8499, 347967],
    },
  ],
  [
    "prater",
    {
      pubkeys: [
        "0x8000091c2ae64ee414a54c1cc1fc67dec663408bc636cb86756e0200e41a75c8f86603f104f02c856983d2783116be13",
        "0x80003a1c67216514e4ab257738e59ef38063edf43bc4a2ef9d38633bdde117384401684c6cf81aa04cf18890e75ab52c",
      ],
      indexes: [55293, 351819],
    },
  ],
  [
    "gnosis",
    {
      pubkeys: [
        "0x8000385f61788781c3514322c14bf4ef51bfee5ed743872ac9ea37a3a11e1e3496f4f5e252ef33fdb5bf3684c13ed210",
        "0x8000e5f66ffb58ef1f8bf8994172da85c77142cc7be24a63d53e572f5ba1149466c5aa0e6a383b2cddf83467cf8e688a",
      ],
      indexes: [57102, 81200],
    },
  ],
  [
    "lukso",
    {
      pubkeys: [
        "0x8000460289c3435bb6af636314142aed624089edb56dc12fc91475176592067ae4216bfe95b651c3af7c1c491a519134",
        "0x80012f0aaa40e9cccf47ea7255ec380976d32c9e92fec0701926d9457e9510d108ae8fd5bea82bf13b85cc82de2729ac",
      ],
      indexes: [24693, 4272],
    },
  ],
  [
    "holesky",
    {
      pubkeys: [
        "0x800000b3884235f70b06fec68c19642fc9e81e34fbe7f1c0ae156b8b45860dfe5ac71037ae561c2a759ba83401488e18",
        "0x800009f644592de8d2de0da0caca00f26fd6fb3d7f99f57101bbbfb45d4b166f8dbe5fd82b3611e6e90fe323de955bd2"
      ],
      indexes: [886680, 68945],
    }
  ],
]);

// TODO: move below to common

const beaconchaApiParamsMap = new Map<string, ApiParams>([
  [
    "mainnet",
    {
      baseUrl: "https://beaconcha.in",
      host: "brain.web3signer.dappnode",
      apiPath: "/api/v1/",
    },
  ],
  [
    "prater",
    {
      baseUrl: "https://prater.beaconcha.in",
      host: "brain.web3signer-prater.dappnode",
      apiPath: "/api/v1/",
    },
  ],
  [
    "gnosis",
    {
      baseUrl: "https://gnosischa.in",
      host: "brain.web3signer-gnosis.dappnode",
      apiPath: "/api/v1/",
    },
  ],
  [
    "lukso",
    {
      baseUrl: "https://explorer.consensus.mainnet.lukso.network",
      host: "brain.web3signer-lukso.dappnode",
      apiPath: "/api/v1/",
    },
  ],
  [
    "holesky",
    {
      baseUrl: "https://holesky.beaconcha.in",
      host: "brain.web3signer-holesky.dappnode",
      apiPath: "/api/v1/",
    },
  ],
]);

import { expect } from "chai";
import { before } from "mocha";
import { ValidatorApi } from "../../../../src/modules/apiClients/index.js";
import { execSync } from "node:child_process";
import { Network } from "@stakingbrain/common";

describe.skip("Validator API: Prater", () => {
  const defaultFeeRecipient = "0x0000000000000000000000000000000000000000";
  const pubkeys = [
    "0xa2cc280ce811bb680cba309103e23dc3c9902f2a08541c6737e8adfe8198e796023b959fc8aadfad39499b56ec3dd184",
    "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7",
    "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a",
    "0x8f2b698583d69c7a78b4482871282602adb7fb47a1aab66c63feb48e7b9245dad77b82346e0201328d66a8b4d483b716",
    "0xa1735a0dd72205dae313c36d7d17f5b06685944c8886ddac530e5aedbe1fca0c8003e7e274ec1b4ddd08b884f5b9a830"
  ];
  const stakerSpecs = {
    network: "prater" as Network,
    consensusClients: [
      {
        name: "Prysm",
        containerName: "DAppNodePackage-validator.prysm-prater.dnp.dappnode.eth",
        token: "0xd59b8238ecaeb255d62c85c6ca8aee185870bd7a27e43f85fd2658267036d94a"
      }
      /**{
        name: "Lighthouse",
        containerName:
          "DAppNodePackage-validator.lighthouse-prater.dnp.dappnode.eth",
        token:
          "api-token-0x0200e6ce18e26fd38caca7ae1bfb9e2bba7efb20ed2746ad17f2f6dda44603152d",
      },
      {
        name: "Nimbus",
        containerName:
          "DAppNodePackage-beacon-validator.nimbus-prater.dnp.dappnode.eth",
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg",
      },
      {
        name: "Teku",
        containerName: "DAppNodePackage-validator.teku-prater.dnp.dappnode.eth",
        token: "cd4892ca35d2f5d3e2301a65fc7aa660",
      },*/
    ]
  };

  for (const consensusClient of stakerSpecs.consensusClients) {
    describe(`Consensus client: ${consensusClient.name}`, () => {
      let validatorApi: ValidatorApi;

      before(() => {
        const consensusIp = execSync(
          `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${consensusClient.containerName}`
        )
          .toString()
          .trim();
        validatorApi = new ValidatorApi(
          {
            baseUrl: `http://${consensusIp}:3500`,
            authToken: consensusClient.token
          },
          stakerSpecs.network
        );
      });

      it("Should post validators", async () => {
        const response = await validatorApi.postRemoteKeys({
          remote_keys: [
            {
              pubkey:
                "0xa2cc280ce811bb680cba309103e23dc3c9902f2a08541c6737e8adfe8198e796023b959fc8aadfad39499b56ec3dd184",
              url: "http://web3signer.web3signer-prater.dappnode:9000"
            },
            {
              pubkey:
                "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7",
              url: "http://web3signer.web3signer-prater.dappnode:9000"
            },
            {
              pubkey:
                "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a",
              url: "http://web3signer.web3signer-prater.dappnode:9000"
            },
            {
              pubkey:
                "0x8f2b698583d69c7a78b4482871282602adb7fb47a1aab66c63feb48e7b9245dad77b82346e0201328d66a8b4d483b716",
              url: "http://web3signer.web3signer-prater.dappnode:9000"
            },
            {
              pubkey:
                "0xa1735a0dd72205dae313c36d7d17f5b06685944c8886ddac530e5aedbe1fca0c8003e7e274ec1b4ddd08b884f5b9a830",
              url: "http://web3signer.web3signer-prater.dappnode:9000"
            }
          ]
        });

        // It may be a first time import or duplicate import
        expect(response).to.be.ok;
      });

      it("Should get validators", async () => {
        const response = await validatorApi.getRemoteKeys();
        const expectedResponse = [
          {
            pubkey:
              "0xa2cc280ce811bb680cba309103e23dc3c9902f2a08541c6737e8adfe8198e796023b959fc8aadfad39499b56ec3dd184",
            url: "http://web3signer.web3signer-prater.dappnode:9000",
            readonly: true
          },
          {
            pubkey:
              "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7",
            url: "http://web3signer.web3signer-prater.dappnode:9000",
            readonly: true
          },
          {
            pubkey:
              "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a",
            url: "http://web3signer.web3signer-prater.dappnode:9000",
            readonly: true
          },
          {
            pubkey:
              "0x8f2b698583d69c7a78b4482871282602adb7fb47a1aab66c63feb48e7b9245dad77b82346e0201328d66a8b4d483b716",
            url: "http://web3signer.web3signer-prater.dappnode:9000",
            readonly: true
          },
          {
            pubkey:
              "0xa1735a0dd72205dae313c36d7d17f5b06685944c8886ddac530e5aedbe1fca0c8003e7e274ec1b4ddd08b884f5b9a830",
            url: "http://web3signer.web3signer-prater.dappnode:9000",
            readonly: true
          }
        ];
        expect(response.data).to.eql(expectedResponse);
      });

      it("Should set fee recipients to all validators", async () => {
        for (const pubkey of pubkeys) await validatorApi.setFeeRecipient(defaultFeeRecipient, pubkey);
      });

      it("Should get fee recipients from all validators", async () => {
        for (const pubkey of pubkeys) {
          const response = await validatorApi.getFeeRecipient(pubkey);
          expect(response.data.ethaddress).to.eql(defaultFeeRecipient);
        }
      });

      it("Should delete fee recipients to all validators", async () => {
        for (const pubkey of pubkeys) await validatorApi.deleteFeeRecipient(pubkey);
      });

      it("Should delete validators", async () => {
        const response = await validatorApi.deleteRemoteKeys({
          pubkeys
        });
        expect(response).to.be.ok;
      });
    });
  }
});

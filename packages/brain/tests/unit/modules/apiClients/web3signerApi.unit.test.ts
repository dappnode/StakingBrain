import { expect } from "chai";
import { before } from "mocha";
import path from "path";
import fs from "fs";
import { execSync } from "node:child_process";
import { Web3SignerApi } from "../../../../src/modules/apiClients/index.js";

describe.skip("Signer API: Prater", () => {
  const keystoresPath = path.resolve(process.cwd(), "keystores");

  const pubkeys = [
    "0xa2cc280ce811bb680cba309103e23dc3c9902f2a08541c6737e8adfe8198e796023b959fc8aadfad39499b56ec3dd184",
    "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7",
    "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a",
    "0x8f2b698583d69c7a78b4482871282602adb7fb47a1aab66c63feb48e7b9245dad77b82346e0201328d66a8b4d483b716",
    "0xa1735a0dd72205dae313c36d7d17f5b06685944c8886ddac530e5aedbe1fca0c8003e7e274ec1b4ddd08b884f5b9a830",
  ];
  const signerContainerName =
    "DAppNodePackage-web3signer.web3signer-prater.dnp.dappnode.eth";
  const host = "web3signer.web3signer-prater.dappnode";
  let signerApi: Web3SignerApi;

  before(() => {
    // Get consensus client IP
    const signerIp = execSync(
      `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${signerContainerName}`
    )
      .toString()
      .trim();
    signerApi = new Web3SignerApi(
      {
        baseUrl: `http://${signerIp}:9000`,
        host,
      },
      "prater"
    );
  });

  it("Should post validators", async () => {
    const keystoresPaths = fs
      .readdirSync(keystoresPath)
      .filter((file) => file.endsWith(".json"));
    const keystores = keystoresPaths.map((file) =>
      fs.readFileSync(path.join(keystoresPath, file)).toString()
    );
    const passwords = Array(keystores.length).fill("stakingbrain");

    const response = await signerApi.importKeystores({
      keystores,
      passwords,
    });

    expect(response.data).to.be.an("array");
  }).timeout(10000);

  it("Should get validators", async () => {
    const response = await signerApi.getKeystores();
    expect(response.data.map((item) => item.validating_pubkey)).to.have.members(
      pubkeys
    );
  });

  it("Should delete validators", async () => {
    const response = await signerApi.deleteKeystores({
      pubkeys,
    });
    expect(response.data).to.be.ok;

    const validators = await signerApi.getKeystores();
    expect(validators.data).to.be.empty;
  });
});

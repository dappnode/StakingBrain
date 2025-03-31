import { Network } from "@stakingbrain/common";

export const getWeb3signerDnpName = (network: Network): string => {
  switch (network) {
    case Network.Mainnet:
      return "web3signer.dnp.dappnode.eth";
    case Network.Gnosis:
      return "web3signer-gnosis.dnp.dappnode.eth";
    case Network.Holesky:
      return "web3signer-holesky.dnp.dapopnode.eth";
    case Network.Prater:
      return "web3signer-prater.dnp.dappnode.eth";
    case Network.Lukso:
      return "web3signer-lukso.dnp.dappnode.eth";
    case Network.Hoodi:
      return "web3signer-hoodi.dnp.dappnode.eth";
    default:
      throw new Error("Invalid network");
  }
};

import { Network } from "./types/index.js";

export const BURN_ADDRESS = "0x0000000000000000000000000000000000000000";

export const ROCKET_POOL_FEE_RECIPIENT = "0xd4E96eF8eee8678dBFf4d535E033Ed1a4F7605b7" as const;

// https://docs.lido.fi/deployed-contracts/#core-protocol
export const LIDO_FEE_RECIPIENT_MAINNET = "0x388C818CA8B9251b393131C08a736A67ccB19297" as const;
// https://docs.lido.fi/deployed-contracts/holesky/#core-protocol
export const LIDO_FEE_RECIPIENT_HOLESKY = "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8" as const;
// https://docs.lido.fi/deployed-contracts/hoodi#core-protocol
export const LIDO_FEE_RECIPIENT_HOODI = "0x9b108015fe433F173696Af3Aa0CF7CDb3E104258" as const;

export const STADER_POOL_FEE_RECIPIENT_MAINNET = "0x9d4C3166c59412CEdBe7d901f5fDe41903a1d6Fc" as const;

export const STADER_POOL_FEE_RECIPIENT_PRATER = "0x34E8Fac4962AF984d6040cec240d1d12eFfac14E" as const;

export const MEV_SP_ADDRESS_HOODI = "0x9CDcc499D53Be0ADb5056355Be774828a593F267" as const;

export const MEV_SP_ADDRESS_MAINNET = "0xAdFb8D27671F14f297eE94135e266aAFf8752e35" as const;

export const MAINNET_ORACLE_URL = "https://sp-api.dappnode.io" as const;

export const TESTNET_ORACLE_URL = "http://65.109.102.216:7300" as const;

export const BRAIN_UI_DOMAIN = (network: Network) =>
  `brain.web3signer${network === "mainnet" ? "" : "-" + network}.dappnode`;

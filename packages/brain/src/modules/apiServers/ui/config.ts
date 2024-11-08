import { BRAIN_UI_DOMAIN, Network } from "@stakingbrain/common";

export const allowedOrigins = (network: Network) => ["http://my.dappnode", `http://${BRAIN_UI_DOMAIN(network)}`];

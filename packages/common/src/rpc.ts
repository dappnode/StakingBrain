// The database allows 6 MiB. Leave room for RPC framing and bulk settings requests.
export const RPC_MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
export const RPC_TIMEOUT_MS = 120 * 1000;
/** Server-to-UI push: validator records changed; clients should refresh their list. Carries no data. */
export const VALIDATORS_CHANGED_EVENT = "validatorsChanged";

# Gloas / ePBS validator configuration

Brain manages configuration. The validator client signs slot-specific proposer
preferences and builder authorizations and supplies the resolved configuration
in proposal requests. The beacon node solicits and selects bids. Web3Signer
continues to provide signing; Brain does not implement those protocol duties.

## Specifications checked

Checked upstream branch heads on 2026-10-19 before implementation, pinned to:

- Keymanager API `master`, [`e5aab3e3ac4b116a2b193000996e4645c8e1bd5f`](https://github.com/ethereum/keymanager-APIs/tree/e5aab3e3ac4b116a2b193000996e4645c8e1bd5f):
  [`apis/builder_config.yaml`](https://github.com/ethereum/keymanager-APIs/blob/e5aab3e3ac4b116a2b193000996e4645c8e1bd5f/apis/builder_config.yaml),
  [`types/builder_entry.yaml`](https://github.com/ethereum/keymanager-APIs/blob/e5aab3e3ac4b116a2b193000996e4645c8e1bd5f/types/builder_entry.yaml),
  `types/uint.yaml`, `types/public_key.yaml`, `types/eth_address.yaml`.
- Beacon API `master`, [`01e99a6530b22941f619bde525cbf8bb61991d42`](https://github.com/ethereum/beacon-APIs/blob/01e99a6530b22941f619bde525cbf8bb61991d42/validator-flow.md):
  validator flow (signed proposer preferences and `produceBlockV4`).
- Builder specs `main`, [`5461ba26626e2ac010eff8c4b8ecf2e288a46fc7`](https://github.com/ethereum/builder-specs/blob/5461ba26626e2ac010eff8c4b8ecf2e288a46fc7/specs/gloas/validator.md):
  Gloas honest validator, authorization identity, payment caps and fee recipient.

These are development specifications. The Keymanager README at this revision
lists no released client version supporting builder configuration. Deployment
requires a validator client implementing these routes and semantics, a compatible
Gloas beacon node, and signing support for the new messages in the validator /
Web3Signer stack. Brain does not infer support from the selected client brand.

## Existing architecture and additions

The shared `ValidatorApi`, per-key lowdb records, bulk settings RPC and dialogs,
fee-recipient enforcement and periodic reload already existed. Builder support
extends those paths. No alternate database or signing/bid-selection service is
introduced. Existing fee-recipient status reporting also now compares the actual
pubkey and address rather than always reporting success.

`ValidatorApi` exposes `getBuilderConfig`, `setBuilderConfig` and
`deleteBuilderConfig` on `/eth/v1/validator/{pubkey}/builder_config`. POST sends
exactly the supplied overrides; DELETE has no body. Uint64s remain decimal
strings throughout validation, JSON persistence, RPC, editing and HTTP requests.
Values outside 0–18446744073709551615, numeric JSON values, invalid hex, malformed
public keys, oversized lists and duplicate URL/auth identities are rejected.
Builder request URLs are limited to absolute ASCII HTTP(S) URLs; use punycode for
internationalized hostnames. Userinfo and ports are supported. Omitted auth data
is compared using the specified canonical hostname bytes, including compressed
IPv6; it is left omitted in storage and requests for the client to resolve.

## Persistence and inheritance

Each validator may have a `builderConfig` in the existing database:

Database writes retain owner-only read/write permissions (`0600`), including
after the JSON adapter atomically replaces the file.

| Stored value | Meaning on application |
| --- | --- |
| Property absent | Unmanaged: no builder endpoint calls, including for older database records and newly imported keys |
| `{}` | POST no overrides; inherit all validator defaults |
| `{ "builders": [] }` | POST an explicitly empty direct-builder list |
| Sparse object | POST exactly these overrides, replacing the prior configuration in full |
| `null` | DELETE the key's builder configuration and follow validator defaults |

Reset intent remains stored as `null`: a failed reset, validator restart, or a
later client-side configuration change must not resurrect the old override.
Periodic reload replays POSTs and DELETEs, including successful ones, after key
imports and fee-recipient application. Each key fails independently and is
retried on the next reload. A bulk edit persists the validated batch before
application; partial application failures are reported with per-key status and a
message that settings are saved and will be retried. Application status is
transient and becomes pending after Brain restarts until application is tried.

GET returns **resolved** client values. It never supplies editor defaults,
updates the database, or generates subsequent POST bodies. Changes to inherited
validator defaults therefore remain effective. Fee and index updates preserve
builder overrides; builder updates preserve fee recipients, index and tags.

## UI and RPC

Select one or more validators and choose **Builder settings**. A single selection
loads its saved overrides into labeled fields and builder cards. Bulk editing
starts with client defaults and explicitly replaces all selected validators'
overrides. Default switches omit numeric fields. Brain is the management point
for direct builders: the selector offers a custom list or no direct builders.
Every normal UI save sends an explicit `builders` list, so client-level builder
lists cannot silently become effective. Older omitted lists remain unchanged
until a user saves; the editor explains that saving replaces the inherited list
and starts with no direct builders selected. Resolved values never seed the list.
The backend still preserves omitted lists for API compatibility, and **Restore
client defaults** retains DELETE semantics (including restoring any client-level
builder list), explained by its tooltip and success message.
Add or remove builder cards and public-key fields without
editing JSON. Advanced settings start collapsed (validation errors open them) and
expose per-builder limits and authorization. Minimum bid and boost explicitly
inherit the global preferences above; their helper text previews those form values.
Numbers remain strings internally, including zero and the full uint64 range.
Restore client defaults saves DELETE intent. A compact table compares saved
choices with effective client values, with per-builder details collapsed. Entries
are matched by exact URL and effective authorization bytes, independently of GET
ordering. These values never fill inherited form fields, and the comparison
excludes unsaved edits. Unavailable reads and saved-only/client-only entries are
shown explicitly.

- `min_bid`: payment floor in Gwei; top-level value covers P2P bids and entries
  without their own floor.
- `builder_boost_factor`: percentage preference, `100` for profit maximization;
  zero prefers local building subject to upstream error/fallback semantics.
  Entries can supply their own floor and boost. The UI displays the maximum uint64
  as **MAX**, preserving the exact string internally. Other percentages weight bid
  comparison (50 = half, 150 = 1.5 times); they do not change the actual payment.
- An empty direct-builder list leaves P2P bids and local building available.
- `max_execution_payment`: per-builder cap in Gwei on trusted execution payment
  counted when selecting a bid: `value + min(execution_payment, cap)`. Zero counts
  none; it does not prove no additional execution payment can arrive.
- `builder_pubkeys`: empty or omitted accepts any builder; otherwise restricts
  accepted bid signatures to the given 48-byte keys. These are builder signing
  identities obtained from the builder, distinct from validator keys. A filter
  applies to its URL entry, leaving other entries and public P2P bids unaffected.
- `auth_data`: opaque 1–4096 bytes, stored as hex and turned into signed
  authorization **inside the validator client**. Omission derives a hostname
  identity there. Authorization values can be inspected in the explicit builder
  dialog; HTTP failure bodies are not echoed into logs or errors because they
  may contain these values.

`updateValidators([{ pubkey, builderConfig }])` saves a replacement; `null`
resets. Existing `feeRecipient` edits can still be sent alone. The read RPC
`getBuilderConfigs([pubkey, ...])` reports saved intent, resolved client values,
last application status, and an independent read status/message per key.
`getValidators` includes saved settings and last application status without
requiring builder endpoint availability. Refresh client status in the dialog to
inspect application attempts after a periodic reload.

HTTP 405/501 are identified as unsupported; 404 explicitly means the endpoint
may be unavailable or the validator key may be missing. Authentication failures,
server failures, malformed responses and request timeouts are exposed. Ordinary
key and fee-recipient operations do not depend on builder API support.

## Smooth

The existing configured fee recipient remains authoritative. Builder
configuration cannot specify an alternate payout address; unknown fields such as
`fee_recipient` are rejected. Reload continues to enforce the configured fee
recipient even when all builder operations fail. In Gloas, protocol payments use
`bid.fee_recipient`; this can differ from the execution payload fee recipient.
The compatible validator client must use the configured destination for its
signed proposer preferences and expected bid recipient. Payment detection and
reward accounting remain with Smooth's existing components.

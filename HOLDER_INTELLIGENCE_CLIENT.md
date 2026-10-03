# Isolated holder watch and inbox client

`holder-intelligence-client.js` exports `MoerHolderIntelligence.createClient` in a plain browser script, or CommonJS exports in Node. No production page loads it. Construction causes no requests; requests remain disabled unless explicitly enabled. It does not sign messages, persist tokens, render HTML, send external notifications or execute trades.

Integration requires a release-reviewed HTTPS API origin and `allowedOrigins` configuration supplied by trusted application code, not query strings, form fields or local preferences. Base URL must be origin-only. Inject `fetch`, the exact native server-enabled Kraken pair list, and `eventTarget: window` for the existing `basedmoer:wallet` events. The server remains responsible for authentication, current-holder checks, pair admission and ownership on every request. No caller-supplied wallet is included in requests.

`getSession()` must synchronously return `{wallet, token, verified: true}` only after the current wallet has completed server challenge/verification. A connected-wallet preference or holder-preview flag alone must not produce this result. The existing `wallet-auth.js` supplies signing helpers, not a verified session accessor; this module deliberately does not read `moeAgentSession` or invent a verified-session bridge. The optional companion coordinator below supplies this bridge; mounting a page remains separate. No production authentication files were changed.

`onUnauthorized(status)` must synchronously revoke the application's current verified authority and clear protected UI for 401/403. It runs only for the same request generation/session; stale errors cannot clear a replacement wallet's session. Disconnect/wallet-switch events abort active requests and invalidate their responses; direct session/token changes are additionally checked after headers and body reads. Call `invalidate()` when changing authority outside existing wallet events, and `dispose()` when unmounting. In-flight mutation cancellation does not undo a request already accepted by the server; request keys support server idempotency.

Supported methods: `createWatch({request_key,spec})`, `getWatch(taskId)`, `cancelWatch(taskId)`, `listNotifications({limit,beforeId})`, `getNotification(id)`, `acknowledgeNotification(id)`. The request schema allows only market/kraken/native pair identity and a USD price `gte`/`lte` condition. IDs/cursors are 32 lowercase hexadecimal characters. There is no unsupported watch-list endpoint.

Responses are untrusted JSON, bounded to 1 MiB of UTF-8 bytes while reading the response stream; rendering must validate expected fields and use `textContent` rather than HTML. A 30-second deadline covers headers and body (configurable from 1 to 60,000 milliseconds); timeout aborts transport. Unsupported response streams and malformed UTF-8 fail closed. Fetch uses `redirect: 'error'`, omits cookies and referrers, and redacts transport/server error bodies. Errors expose only fixed local codes and HTTP status. No live holder or browser-to-hosted-backend validation is claimed by these unit tests.

Price watches use the backend's last-trade observation, not an executable bid/ask quote. In-app completion notices are local durable notifications; acknowledgment only marks them read. They do not establish external delivery or trading readiness.

Run `node --test tests/holder_intelligence_client.test.cjs` and `node --test tests/*.test.cjs` from this directory.

## In-memory authentication coordinator

`holder-intelligence-session.js` exports `MoerHolderSession.createSession` (CommonJS in Node). It supplies the verified accessor for the client without trusting legacy storage. Both modules remain unmounted. Instantiate it with the same trusted API origin/allowlist, injected `fetch`, `getWallet` (the existing `connectedWallet` signing helper accessor), `signChallenge` (existing `signMessage`), and `eventTarget: window`. The event target is required when enabled. Call `authenticate()` only on an explicit user login gesture. Pass its `getSession` and `onUnauthorized` into the holder client. Tokens stay in coordinator memory and disappear on reload, expiry, disconnect, a new login attempt or revocation.

Example wiring for a future reviewed page (not a production configuration):

```js
const auth = MoerHolderSession.createSession({
  enabled: releaseConfig.holderIntelligenceEnabled,
  baseURL: releaseConfig.apiOrigin,
  allowedOrigins: releaseConfig.approvedApiOrigins,
  fetch: window.fetch.bind(window),
  getWallet: connectedWallet,
  signChallenge: signMessage,
  eventTarget: window,
  onChange: () => clearProtectedViews()
});
const inbox = MoerHolderIntelligence.createClient({
  enabled: releaseConfig.holderIntelligenceEnabled,
  baseURL: releaseConfig.apiOrigin,
  allowedOrigins: releaseConfig.approvedApiOrigins,
  allowedPairs: releaseConfig.serverEnabledNativePairs,
  fetch: window.fetch.bind(window),
  getSession: auth.getSession,
  onUnauthorized: auth.onUnauthorized,
  eventTarget: window
});
// An explicitly reviewed login button handler may call auth.authenticate().
```

The legacy backend `/v1/agent/auth/challenge` and `/verify` are **not read-only**: challenge creation writes a row; verification consumes the challenge, inserts a session, ensures an account and logs login. This code does not call them in this change. Mounting it against production requires the separate production release decision and real holder validation. Tests inject transport/signing doubles; no actual wallet signatures or hosted login occurred.

Coordinator validation follows the inspected backend contract: exact Base login message template and nonce, matching challenge wallet, positive holder balance, future timezone-aware challenge expiry within 12 minutes, 65-byte EOA signature, matching `account.wallet_address` in verification, URL-safe session token and future session expiry within 25 hours. Unknown templates or response variants fail closed and need reviewed contract updates. The current backend verification uses EOA signature recovery; this does not add smart-account/ERC-1271 verification support.

A 60-second total deadline covers login fetches, response streams and waiting for the signer (configurable up to 120 seconds). A timeout cannot dismiss an already opened wallet prompt, but late signatures cannot trigger verification or gain local authority. Responses cap at 64 KiB UTF-8 bytes and reject malformed UTF-8. Every phase checks the wallet and event generation; A→B→A events cannot resurrect an obsolete flow. Integrators must emit invalidation for every authority change, including provider account/chain events; mere periodic reads cannot detect an unreported A→B→A transition. Server holder checks remain authoritative on subsequent protected requests.

## Versioned pilot proof

The session coordinator preserves the legacy production login as the default `loginProofVersion: 'legacy-production-v1'` with `audience: null`. It does not infer or silently fall back between login protocols. The research release configuration explicitly selects `loginProofVersion: 'moer-staging-eoa-v1'`, remains disabled, and leaves its audience unset until review.

When enabled, the pilot option requires a trusted configured canonical HTTPS `audience` identical to the configured API origin. Canonical spelling excludes trailing slash, explicit default `:443`, credentials, paths, query and fragment. The expected audience never comes from the challenge response, page URL, storage, headers or provider. Both challenge and verification must echo `login_proof_version: 'moer-staging-eoa-v1'` and the same configured audience. The exact signed template is:

```text
Based Moer — Moe AI Staging Login v1

Wallet: {lowercase wallet}
Chain: Base (8453)
Audience: {configured HTTPS API origin}
Nonce: {32 lowercase hex characters}
Issued At: {server ISO timestamp}
Expires: {server ISO timestamp}

Signing proves wallet ownership for this staging audience. It does not authorize a trade or transfer funds.
```

The challenge's timezone-aware `issued_at` field must match the signed message, be no more than 30 seconds ahead of the local clock, and no more than 12 minutes old. Expiry must follow issuance within 12 minutes and remain in the future. Missing, downgraded or mismatched proof metadata fails before signing; verification metadata mismatch prevents storing local authority. Browser clock checks are a conservative UI guard; backend signature recovery, nonce consumption, holder checks, expiry and audience-scoped session storage remain authoritative.

This protocol protects the isolated pilot relying party. It does not change the legacy production Agent auth routes, enable the research page or prove a real wallet/provider journey. The pilot's same-origin login bridge must be deployed and configured separately before an enabled browser acceptance run.

## Deterministic authorized evidence review

`client.reviewRecords({intent: 'review_records', records: [{product, record_id}]})` posts to `/v1/intelligence/review` using the same current verified bearer, transport deadline, redirect refusal and generation fencing. The request contains 1–8 unique exact references. Products are `scanner`, `radar_signal` and `radar_candidate`; IDs use 1–128 ASCII letters, digits, underscores or hyphens. Additional fields and arbitrary instructions are rejected. Request JSON is capped at 4096 bytes; the streamed review response is capped at 128 KiB.

This is a deterministic authorized record review, not a language-model conversation or a market scan. The server owns record scope, identity resolution, capture provenance, cutoff and freshness. Missing and foreign records are both unavailable; callers cannot infer existence or claim ownership from an ID. A complete review means every supplied record has explainable evidence, not that the markets or strategies are safe or profitable.

The research page accepts one `product record_id` reference per line. `holder-intelligence/review.js` validates the versioned response, exact requested reference order/binding, item outcomes and next actions, coverage totals, source citations and chronology, record hashes, supported facts and limitations. It rejects enabled execution or saved-memory flags. Each tool explanation is bounded to 8192 bytes. Rendering uses created elements and `textContent`; opaque citation references/source timestamps are shown literally, never converted into guessed URLs or independent-witness claims.

Both trusted facts and missingness are visible. Quality scores remain uncalibrated, costs/net RR remain unknown where the evidence says so, and candidate prices remain recorded observations rather than executable quotes. Each item's source limitations stay attached. Review results and entered record references clear on authority changes; late results cannot populate a replacement wallet's view. No conversation memory or record content is persisted in the browser.

## Bounded record discovery

`client.listRecords({product, limit: 20})` calls authenticated `GET /v1/intelligence/records` for an explicit supported product and a limit of 1–20. It uses the same current bearer and abort/deadline fencing, with a 64 KiB response cap. This endpoint lists exact references in the approved shared-holder scope, not private account resources, ticker search, market opportunities or verified native identities.

The page adds an explicit Load recent records gesture and checkbox selection into the existing manual review form. Up to eight references may be selected, including valid manually entered references from another product. Selecting a reference performs no review or trade automatically. Authority changes clear listings, choices and entered references. A replaced listing's detached controls cannot modify the current selection. Current access denial and stale responses share the existing authenticated failure handling.

Every listed item is explicitly `evidence_state: not_evaluated`. Optional source labels are not native identity. Optional `recorded_at` timestamps represent stored source-row time, not provider observation, availability, live market freshness or proof of provenance. Those gaps can only be assessed through the authorized review. The bounded list is not complete market coverage or a recommendation ranking.

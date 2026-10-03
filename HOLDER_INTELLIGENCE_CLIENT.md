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

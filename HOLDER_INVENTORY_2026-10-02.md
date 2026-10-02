# Holder integration inventory — 2026-10-02

Source: moer87/basedmoer-website main, 7acdbee181313c67b6c34d1b5d641fb9e1c834cc. Full recursive tree and 36 branch names reviewed; selected code/branch comparisons reviewed. No AGENTS.md exists in that tree. This workspace contains a fetched text subset, not a full clone. No production changes or authenticated holder actions performed.

## Existing work worth preserving

- shared.js: public pixel-brand navigation, eligible Base NFT balance checks using public read RPC fallback, Base Account connection with injected fallback, account restoration and disconnect, client holder visibility. Preview bypass is false.
- academy/academy.js: 24 modules, eight tracks, practice and quiz rendering, browser-local completed modules/scores.
- academy-xp.js: authenticated progress restoration and idempotent-looking claim calls to ecosystem endpoints (backend enforcement must be independently reviewed).
- profile/index.html and progression.js: Passport, badges, learning tracks, NFT selection, cosmetics, daily XP, server Academy restoration, Flip stats.
- arcade/arcade.js: actual canvas game, original spacecraft assets, sound, authenticated run/start/finish calls. Client score submission is not proof of server-validated gameplay.
- moer-flip/index.html: actual game UI and server-oriented XP flow; not a paid wagering product.
- agent.js: paper Agent settings and state, source-aware wallet login, execution-health and bounded permission-plan surfaces; real execution remains explicitly locked.
- wallet-auth.js: reusable source-aware signer already exists, suitable for future Passport/Arcade unification.

## Concrete fix implemented

shared.js loads progression.js dynamically inside its DOMContentLoaded callback. profile/index.html does not include progression.js statically. progression.js previously registered only a DOMContentLoaded callback after that event had already happened, leaving its Passport progression shell and startup inactive.

Changed progression.js to initialize immediately when document.readyState is interactive/complete, or register a once-only listener while loading. No server requests, permission paths, scoring or access checks changed.

Regression: node --test tests/page_extras_startup.test.cjs — 3 passed, covering loading/interactive/complete execution of the actual script in a Node VM. This verifies startup scheduling, not real-holder/backend acceptance.

Academy XP and Radar XP are included statically in their HTML, so their similar callbacks are currently valid. They were not changed.

## End-to-end gaps

1. Passport and Arcade authentication still require window.ethereum and bypass the existing source-aware wallet-auth.js. Base Account-only holders can therefore connect but fail to authenticate those products. Profile NFT reads also require injected ethereum rather than public Base reads.
2. Academy state uses one browser-wide moeAcademyV3 key; restored remote scores merge into it, and Academy XP sync submits those scores under the current bearer session. Wallet separation and authoritative server quiz acceptance need design and backend validation before declaring wallet-bound progress reliable.
3. Academy sync records lastSignature even when claims fail, suppressing automatic retries until scores change or manual sync occurs.
4. Passport dynamic startup bug fixed locally only. Actual eligible-holder login, API responses, restoration, reconnect, account switch and reload acceptance remain unverified.
5. Client holder visibility is not backend authorization. api/moe.js serves upstream signals without checking holder identity; backend endpoint access and intended public/holder boundary must be reconciled.
6. api/moe.js can return ok:true/source:null/empty signals if health succeeds but both signal sources fail. updated_at is proxy response time rather than source scan freshness. Thus ONLINE/NO OPEN SETUPS can conceal collection failure. Fix alongside backend freshness contract.
7. progression.js references absent assets/frame1.png and frame2.png (CSS fallback exists). Profile selection updates a token label but not actual token metadata image.
8. Per-wallet token/session lifetime, revoked eligibility, game run replay and submitted score trust require server-side review and holder acceptance evidence.

## Branch recovery

- radar-v05-docs-20260925: ahead 2/behind 0, head b9d24d1332f482843db2d88e804b335d69e43c46. Only docs/index.html and intelligence/index.html. Safe to review separately; no functioning product implementation in those two commits.
- holder-release-readiness: ahead 7/behind 12, diverged. Compare patches partly duplicate fixes already in main (contract, preview scope, audio, persistence); do not merge wholesale.
- complete-holder-ecosystem-document: ahead 1/behind 7, intelligence document only; salvage content after factual reconciliation.
- final-visual-integration: behind 97, no unique changes.
- pretestnet-ready: ahead 22/behind 98, broad divergent site changes; includes release checklist/operations/audit candidates. Recover individual useful files after review.
- agent-base-account-auth: ahead 21/behind 98; main agent.js already has source-aware signing. Branch name alone does not mean the implementation is missing.

References: https://github.com/moer87/basedmoer-website/tree/7acdbee181313c67b6c34d1b5d641fb9e1c834cc and https://github.com/moer87/basedmoer-website/compare/main...holder-release-readiness

## Follow-up implementation: Academy separation and retries

Added academy-state.js and academy-sync.js. Wallet storage uses moeAcademyV4:<wallet>, anonymous and creator-preview stores are separate. Prior V3/V2 browser data is read only for anonymous context and never automatically imported into a wallet account. Academy, Passport and remote restore share this storage. Wallet events refresh the Academy display.

Sync captures wallet and bearer session per operation. Concurrent sync is single-flight; wallet/session changes discard restoration results and prevent further claims from the stale batch. Failed claims leave the signature pending so unchanged results retry, while entirely successful batches stop repeating. Progression and Flip result updates also check current context before rendering.

Changed/additional files: academy-state.js, academy-sync.js, academy-xp.js, academy/academy.js, academy/index.html, profile/index.html, progression.js, tests/academy_isolation.test.cjs, tests/academy_browser.test.cjs, tests/page_extras_startup.test.cjs.

Verification: 10 Node tests passed, covering browser helper loading, anonymous/legacy separation, wallet switching, failure retry, stale restoration, concurrent sync, preview isolation and dynamically loaded Passport startup. JavaScript syntax checks passed. No actual holder signature/API write/deployment performed.

These changes resolve browser cross-wallet contamination and automatic retry suppression locally. They do not establish server-side quiz-score integrity, backend authentication, or eligibility enforcement. Existing Passport/Arcade injected-provider mismatch and proxy freshness gaps remain.

Independent review by scanner_build identified additional Passport races. Follow-up guards authenticate challenge/sign/verify before storing session, prevents stale /me errors clearing a new session, guards daily/equip rendering and errors, and resets XP/cosmetics/Flip on wallet events. Shared wallet connect clears prior session/permission/ship on address changes. Deferred-promise regressions added; current total 15 passing tests. Authentication remains injected-only until source-aware login work is separately integrated.

Independent second review by scanner_build passed the reported Passport race corrections. Remaining preexisting overlapping connection/disconnect holder-RPC race is outside this patch; generation fencing should be reviewed later. Final regression count: 15 passed.

## Connection generation fencing

Follow-up shared.js now gives connect and restore attempts generation IDs. Wallet/source/holder state is committed only after ownership lookup completes and the generation is still current. Disconnect and new connect invalidate older attempts immediately, clear session/permission/ship state and holder visibility, and dispatch the disconnected wallet event. Stale attempts cannot restore wallet state, overwrite a new token, show obsolete alerts, or initiate injected fallback after cancellation. Injected wallet chain switching also checks generation before proceeding.

New tests/wallet_generation.test.cjs exercises deferred ownership RPCs for disconnect, overlapping connects, pending restore, and restore superseded by new connect. Final suite: 19 Node tests passed. This is local connection fencing, not RPC reliability or real-holder acceptance evidence.

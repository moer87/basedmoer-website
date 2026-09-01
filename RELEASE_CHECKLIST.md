# Based Moer — Pre-Testnet Release Checklist

Release state: **PRE-TESTNET RELEASE CANDIDATE**  
Production live-fund execution: **DISABLED**  
Public mint promotion: **WAITING FOR TESTNET**

## 1. Website release candidate

- [x] Home page aligned to testnet-first launch order.
- [x] Moerverse surface present.
- [x] Moer AI Live holder surface present.
- [x] Base Account-first holder access integrated.
- [x] Moer Agent authentication supports Base Account and injected-wallet fallback.
- [x] Academy present.
- [x] Arcade present.
- [x] Moer Flip present.
- [x] Profile / XP surface present.
- [x] Professional project documentation added at `/docs/`.
- [x] Public release status added at `/status/`.
- [x] Premature public mint CTA removed from home and Live release-candidate surfaces.
- [x] Automated static-site audit added.
- [ ] Creator visual acceptance on desktop and mobile preview.

## 2. Moer AI / backend

- [x] Scanner v3.1 remains the versioned decision engine.
- [x] Production confidence floor remains 78.
- [x] Paper/shadow Agent consumes Scanner signals only.
- [x] Radar remains separate from Scanner execution.
- [x] Base-native DEX research collect/measure/forward/OOS safeguards built.
- [x] Holder/concentration forward + OOS safeguards built.
- [x] Aggregate ERC-20 transfer-flow forward + OOS safeguards built.
- [x] Flashblocks deduplicated market-context forward + OOS safeguards built.
- [x] Research score impact remains zero unless separately approved.
- [x] Main execution is disabled.

## 3. Account / execution safety

- [x] Base Account website integration prepared.
- [x] Spend Permission planning/sign/status/revoke lifecycle prepared.
- [x] Permission signatures are not exposed in normal API responses.
- [x] Base Sub Account read-only prototype prepared.
- [x] CDP managed-operator policy layer prepared.
- [x] Raw operator private keys prohibited by design.
- [x] AgentKit constrained to Moer-approved action boundary.
- [x] Base-only execution spender safety invariants present.
- [x] Emergency revoke / pause / permanent disable controls present.
- [x] Foundry + Python + Slither pre-testnet gates established.

## 4. Testnet gate — Base Sepolia

The following items MUST use test assets only and begin only after explicit testnet deployment approval.

- [ ] Re-run complete backend + website CI at release-candidate SHAs.
- [ ] Confirm Base Sepolia RPC/preconfirmation availability.
- [ ] Deploy testnet-only Moe execution spender.
- [ ] Verify deployed bytecode/config.
- [ ] Sign bounded test Spend Permission.
- [ ] Fetch and verify permission state.
- [ ] Generate reviewed quote.
- [ ] Simulate transaction before sending.
- [ ] Execute test-USDC route only.
- [ ] Verify recipient output.
- [ ] Verify transaction lifecycle/confirmation state.
- [ ] Exercise reverse route if supported by reviewed test route.
- [ ] Revoke permission.
- [ ] Confirm revoked permission cannot be used.
- [ ] Run wrong-chain / wrong-spender / over-allowance / expired / revoked negative controls.
- [ ] Record testnet findings and fixes.
- [ ] Repeat until clean.

## 5. Post-testnet launch preparation

Do not begin public mint promotion until section 4 is complete and accepted.

- [ ] Connect official domain to the approved Vercel production deployment.
- [ ] Verify apex + `www` + SSL + redirects.
- [ ] Final production smoke test on official domain.
- [ ] Audit Discord channels, roles, permissions, bots and invite.
- [ ] Rotate any historical Discord webhook still in use.
- [ ] Verify Based Ape Punks LaunchMyNFT collection settings and mint state.
- [ ] Verify supply, mint price, network, collection address, limits and metadata.
- [ ] Prepare launch announcement copy.
- [ ] Produce launch video / trailer.
- [ ] Prepare X graphics, clips and content calendar.
- [ ] Open holder onboarding instructions.

## 6. Mainnet gate

A successful testnet does **not** automatically approve real-fund execution.

- [ ] Independent contract/security review for meaningful public funds.
- [ ] Production authenticated Base RPC.
- [ ] Production managed signer/operator configured.
- [ ] Production spender/router/assets re-verified.
- [ ] Mainnet permission UX reviewed.
- [ ] Mainnet negative controls repeated.
- [ ] Explicit mainnet approval.

## Release rule

**Testnet first. Launch second. Mainnet execution is a separate later gate.**

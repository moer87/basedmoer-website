# Based Moer — Launch Operations Runbook

This runbook starts **only after the Base Sepolia rehearsal has passed and the release candidate has been accepted**.

## Release order

1. Complete Base Sepolia test run.
2. Fix all findings and rerun until clean.
3. Approve the website release candidate.
4. Connect `basedmoer.com` to the approved Vercel production deployment.
5. Run official-domain smoke tests.
6. Audit and finalize Discord.
7. Audit and finalize Based Ape Punks on LaunchMyNFT.
8. Produce launch video, graphics and copy.
9. Open public mint campaign.
10. Onboard holders into the approved product surfaces.

---

## A. Official domain cutover

### Vercel

- Open the **Bald Moe** team.
- Open the **basedmoer** project linked to `moer87/basedmoer-website`.
- Confirm the intended release commit is the approved production commit.
- Project Settings → Domains.
- Add `basedmoer.com`.
- Add `www.basedmoer.com`.
- Copy the **exact DNS values shown by Vercel at that time**. Do not use remembered or hard-coded Vercel DNS values.
- Keep `basedmoer.com` as the canonical URL unless a later brand decision changes this.
- Configure `www.basedmoer.com` to redirect to the canonical apex domain.

### Spaceship

Recommended approach: keep Spaceship DNS/nameservers unless there is a specific reason to transfer DNS hosting.

- Spaceship → Domain Manager → `basedmoer.com` → Advanced DNS.
- Identify current web records for root (`@`) and `www`.
- Preserve unrelated records, especially MX/TXT email records.
- Remove only web records that conflict with the values Vercel requested.
- Add the exact root/apex record requested by Vercel.
- Add the exact `www` record requested by Vercel.
- Save.
- Return to Vercel Domains and wait for verification.
- Confirm SSL is issued.

### Domain smoke test

- `https://basedmoer.com/`
- `https://www.basedmoer.com/` redirects correctly.
- `/moerverse/`
- `/docs/`
- `/status/`
- `/live/`
- `/academy/`
- `/arcade/`
- `/moer-flip/`
- `/profile/`
- `/robots.txt`
- `/sitemap.xml`
- random missing route renders branded 404.
- Base Account login works.
- Injected-wallet fallback works.
- Holder/non-holder gating works.
- Moer AI API surface loads.
- All GIF/video/image media render without overflow.

---

## B. Discord launch audit

- Rotate any historical webhook that may have been exposed or reused.
- Confirm server ownership/admin recovery methods.
- Review every role from highest to lowest privilege.
- Remove unnecessary `Administrator` permissions.
- Confirm bot roles sit below the owner/admin role and above only the roles they need to manage.
- Audit channel permissions for `@everyone`, holders, staff and bots.
- Test the public invite in an incognito/non-member session.
- Create/finalize:
  - welcome / start-here
  - announcements
  - official-links
  - faq / docs
  - mint-info
  - holder-chat
  - support
  - bug-reports
  - Moer AI / product feedback
- Pin only verified official links.
- Publish a scam-warning message: staff never DM first for wallet seeds/private keys.
- Test holder role workflow if NFT verification is used.
- Test every bot command/webhook used for launch.

---

## C. LaunchMyNFT audit — Based Ape Punks

Do not publish the mint link as the main website CTA until this section is signed off.

- Network: Base.
- Collection address: verify against the actual deployed collection.
- Supply: verify 2,222.
- Mint price: verify intended public price before launch.
- Per-wallet limits: verify intended behavior.
- Start state/date: verify exactly.
- Metadata reveal state: verify.
- Royalties / payout address: verify.
- Team/treasury destination: verify.
- Mint page branding and collection copy: final proofread.
- Social links: official X, Discord, website only.
- Perform a controlled mint test with a launch wallet if the platform/state allows it.
- Confirm the NFT appears correctly on Base explorers/marketplaces after the test.
- Confirm holder-access detection recognizes the test holder on Based Moer.

---

## D. Launch media package

Minimum launch package:

1. **Hero trailer** — 20–35 seconds.
   - Moerverse / pixel world opening.
   - Based Ape Punks movement.
   - Moer AI / Scanner / Radar glimpse.
   - Academy / Arcade / Flip glimpse.
   - Based Moer + Base identity.
   - final mint date/link frame.

2. **Short vertical cut** — 8–15 seconds for X/social reposts.

3. **Static launch graphic** — mint date, supply, chain, price, official domain.

4. **Product explainer carousel/thread** — what holders actually unlock.

5. **Safety graphic** — only official links; never share seed/private key.

---

## E. Public launch checklist

- Official domain green.
- Discord green.
- LaunchMyNFT green.
- Testnet report accepted.
- Website release commit frozen.
- Backend release commit frozen.
- No unresolved P0/P1 issues.
- Public mint CTA enabled deliberately in one reviewed change.
- Announcement video uploaded and checked.
- X post/thread scheduled or ready.
- Discord announcement ready.
- Holder onboarding instructions ready.
- Support/bug-report path staffed.

## Rule

**Never let marketing turn on a product state that engineering has not approved.**

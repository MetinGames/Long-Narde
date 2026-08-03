# Nardora Decision Log

Last reviewed: **2026-08-03**

This log records durable decisions and their reasoning. New entries are appended. If a decision changes, retain the original and mark it superseded by the new entry.

## Status

- **Accepted:** binding until superseded.
- **Direction:** preferred route; final provider or detail still needs evidence.
- **Open:** required before the relevant phase.

## Decisions

### D-001 — Player-facing brand is Nardora

**Status:** Accepted  
**Decision:** The player-facing product is **Nardora**. Store/SEO naming may use **Nardora: Long Narde Game**. Long Narde remains a game-type/rules descriptor.  
**Constraint:** Keep the MetinGames/Long-Narde repository name and GitHub Pages URL for now so existing links do not break.

### D-002 — English default; Turkish and Russian first-class

**Status:** Accepted  
**Decision:** English is the default for international reach. Turkish and Russian remain aligned and selectable through the shared i18n flow.

### D-003 — Web-first staged delivery

**Status:** Superseded by D-018
**Decision:** Stabilize web/PWA first; then Yandex Games, Android, iOS, online private tables and social features in sequence.

### D-004 — Preserve the engine; avoid a framework rewrite

**Status:** Accepted  
**Decision:** Continue the plain JavaScript module and Canvas architecture. Reduce large-file risk through small test-backed extractions.

### D-005 — GitHub is the durable execution source

**Status:** Accepted  
**Decision:** ROADMAP is the phase plan; Issues are the active queue. Code, tests, Issue state and ROADMAP are synchronized in one delivery cycle.

### D-006 — Rule accuracy is a release contract

**Status:** Accepted  
**Decision:** Maximum dice use, higher-die rule, special opening doubles, six-point prime restriction, wraparound, bearing off, undo and win detection remain regression-tested. Rule changes need explicit approval and tests.

### D-007 — Champion is planned, not shipped

**Status:** Superseded by D-016
**Decision:** Current code exposes Easy, Medium and Master. Champion is a planned benchmarked level and must not be described as shipped until verified. Its aim is to defeat Metin through stronger play, not hidden advantages.

### D-008 — Quick Bear-Off preserves choice

**Status:** Accepted  
**Decision:** Quick Bear-Off may be optional. Automation is allowed only when the legal continuation is unambiguous.

### D-009 — Original convincing audio

**Status:** Accepted  
**Decision:** Replace placeholder/low-quality effects with convincing dice and checker recordings, including Metin's recordings when available, plus volume controls and safe preload.

### D-010 — Social play is private and safe by default

**Status:** Accepted  
**Decision:** Private rooms, invites, text, quick emoji and later voice/video support the shared-table experience. Camera and microphone are off by default; mute, leave, block and report stay accessible.

### D-011 — Never trust the client for competitive outcomes

**Status:** Accepted  
**Decision:** Online dice, legal moves, results, scores and ratings are validated by an authoritative service. Secrets and privileged logic never ship in browser code.

### D-012 — One proven web codebase for mobile

**Status:** Direction  
**Decision:** Use Capacitor to package the web game for Android and iOS unless lifecycle, performance or store evidence requires another approach.

### D-013 — Prefer managed online/media infrastructure

**Status:** Direction  
**Decision:** Evaluate Supabase or equivalent for auth/database/presence/realtime and LiveKit or equivalent for voice/video. Provider choice remains open until cost, privacy, regional performance, limits and exit paths are compared.

### D-014 — Measure before optimizing

**Status:** Accepted  
**Decision:** Profile move search, state copying, rendering and preload before Web Workers, caching complexity or architecture changes.

### D-015 — Minimum-tool principle

**Status:** Accepted  
**Decision:** Install a tool or plugin only when it removes a current bottleneck, adds a missing safety/control layer, or measurably shortens a scheduled phase. Record its owner, purpose, cost, data access and removal trigger. Avoid overlapping tools for the same job without a time-boxed comparison.

### D-016 — Champion is shipped and remains evidence-driven

**Date:** 2026-08-03
**Status:** Accepted
**Decision:** Champion is a player-selectable TR/EN/RU bot level on `main`, backed by deterministic multi-move planning, legality regressions, callback safety, and performance checks. Future work strengthens its position evaluation against representative games; it never receives hidden dice or rule advantages.
**Reason:** The implementation and automated verification now exist, so the previous planned-only status is stale.
**Consequences:** Champion may be described as shipped, but not as unbeatable. Any stronger search or Web Worker change still requires measurement and regression coverage.
**Review trigger:** Real-match evidence shows repeatable strategic weaknesses, unacceptable turn latency, or a legality regression.

### D-017 — Offline updates preserve a coherent playable version

**Date:** 2026-08-03
**Status:** Accepted
**Decision:** Nardora uses a dependency-free, versioned app-shell cache for its first PWA foundation. Required local-play assets are precached atomically. An installed update waits during the current session, activates on the next page load, removes only older Nardora caches, and reloads once under the new version.
**Reason:** Offline play must not leave testers with a partially cached build or switch JavaScript versions during a match. The buildless GitHub Pages deployment also benefits from a small auditable service worker instead of a new runtime dependency.
**Consequences:** Every precached shell change must increment `CACHE_VERSION` in `service-worker.js`; focused tests verify the cache inventory and update lifecycle. A no-op replacement service worker remains the recovery path if offline interception ever needs to be disabled.
**Review trigger:** The app introduces code splitting, a build pipeline, large asset growth, background sync, or update behavior that cannot be kept coherent with this policy.

### D-018 — Start the social-platform critical path before distribution completes

**Date:** 2026-08-03
**Status:** Accepted
**Decision:** Nardora will keep its web/PWA quality gates while pulling social-platform foundations into Phase 1. Honest mode entry, local identity seams, and a provider-neutral private-table contract may progress before Yandex/mobile packaging is complete. Hosted accounts, personal-data collection, paid services, and provider commitments remain behind their explicit approval gates.
**Reason:** The product goal is a safe social game platform, and strictly postponing every identity, room, invite, presence, and reconnect boundary until after all distribution work would delay the highest-leverage architecture and player journey.
**Consequences:** Issues [#10](https://github.com/MetinGames/Long-Narde/issues/10), [#15](https://github.com/MetinGames/Long-Narde/issues/15), and [#16](https://github.com/MetinGames/Long-Narde/issues/16) form the immediate social critical path. Distribution continues in parallel. Unavailable online modes remain honest, trusted outcomes remain server-authoritative, and low-value cleanup cannot displace this path without evidence.
**Review trigger:** The local vertical slice exposes a contract flaw, real-device/release quality regresses, or provider/privacy evidence changes the safe implementation order.

### D-019 — Local identity is device-only and outcome-neutral

**Date:** 2026-08-03
**Status:** Accepted
**Decision:** Nardora's first player identity is a versioned, resettable on-device record containing only a generated local ID, a bounded nickname, and one of 15 built-in avatar IDs. Local progression uses a separately resettable versioned store. Only `{ id, displayName, avatarId }` may enter the private-table identity projection; achievements, statistics, results, ratings, dice, and moves remain outside it.
**Reason:** Players need continuity and personality before hosted accounts exist, while the product must avoid premature personal-data collection and client-authoritative competitive claims.
**Consequences:** The profile works offline without a provider, legacy local statistics migrate, and the Friend Match controller can consume a stable identity contract. Custom photos, cloud sync, account recovery, public profiles, and remote ranking remain gated by account/privacy/moderation decisions.
**Review trigger:** An approved hosted account model requires identity linking, deletion/export, recovery, age handling, or a moderated custom-avatar policy.

### D-020 — Local Friend Match preview never implies online availability

**Date:** 2026-08-03
**Status:** Accepted
**Decision:** Nardora may expose a separate same-device Friend Match lifecycle preview driven by the provider-neutral in-memory adapter. The real Friend Match and Online mode entries remain natively disabled until an approved hosted flow works end to end. The preview must state that the second player is simulated locally and that no network, account, shareable invite, personal-data upload, or authoritative game outcome exists.
**Reason:** The client needs a player-facing contract proof for room, invite, presence, reconnect, leave, and close behavior without misleading players or prematurely committing to a provider and data model.
**Consequences:** The local controller can validate UI lifecycle, localization, accessibility, stale-callback handling, revision ordering, and resume-token rotation now. It cannot start a playable online table, fabricate dice/moves/results, or be relabelled as online availability. Hosted work stays behind [#19](https://github.com/MetinGames/Long-Narde/issues/19) evidence and Metin's explicit approval gate for [#20](https://github.com/MetinGames/Long-Narde/issues/20).
**Review trigger:** A hosted adapter, approved account/privacy model, authoritative rule service, and end-to-end invite/reconnect flow are ready for controlled testing.

### D-021 — Supabase leads the private-table trial; commitment remains open

**Date:** 2026-08-03
**Status:** Direction
**Decision:** Use Supabase as the preferred candidate for a synthetic-data, free-tier private-table trial. Keep Cloudflare Durable Objects as the technical fallback if the Supabase authority, latency, metering, or reconnect gates fail; do not use Firebase for the first trial. This direction does not authorize a provider project, billing, real-player data, or a hosted availability claim.
**Reason:** Supabase currently offers the best delivery/exit balance through integrated guest Auth, private Realtime authorization, Presence, Postgres transactions, reports, backups, and a standard database export path. Durable Objects provide the cleanest per-room authority and WebSocket coordination but require more identity, cross-room, observability, and export tooling. Firestore is mature but its listener/read billing and provider-specific data model make cost and exit less predictable for this slice. The evidence and gates are recorded in [PRIVATE_TABLE_PROVIDER_RESEARCH.md](PRIVATE_TABLE_PROVIDER_RESEARCH.md).
**Consequences:** A future approved trial must keep all provider code behind the #16 adapter, submit gameplay commands to trusted transactional code, keep client Broadcast outcome-neutral, use synthetic identities, exercise deletion/export, and retain the local preview as the no-provider fallback. Issue #20 remains blocked until Metin explicitly approves the provider, EU region, minimal data map, retention, and any spend.
**Review trigger:** The synthetic trial misses an authority/privacy test, command-to-event p95 exceeds 350 ms on agreed routes, reconnect p95 exceeds two seconds, the beta model exceeds the evaluation ceiling, export/restore fails, or current provider pricing/limits materially change.

## Open decisions

1. **Monetization:** premium purchase, ads, cosmetic purchases, subscription or hybrid.
2. **Launch audience priority:** first geographic/linguistic market and acquisition message.
3. **Brand system:** final logo, icon, typography, colors and store-ready name/trademark checks.
4. **Account model:** guest transition, age assumptions, recovery, deletion and export.
5. **Ranking:** rating algorithm, seasons, inactivity, anti-smurfing and group rules.
6. **Provider commitment:** backend, hosting/preview, observability, analytics and media after trials.
7. **Moderation:** report handling, sanctions, appeals and avatar/photo policy.
8. **Commercial targets:** numeric retention, crash-free session and acquisition goals after baseline data.

## Future entry template

### D-XXX — Short title

**Date:** YYYY-MM-DD  
**Status:** Accepted / Direction / Open / Superseded  
**Decision:** What was decided.  
**Reason:** Why this is the best current choice.  
**Consequences:** What becomes easier, harder or excluded.  
**Review trigger:** Which new evidence would cause reconsideration.

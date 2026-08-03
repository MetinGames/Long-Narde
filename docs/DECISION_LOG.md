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

**Status:** Accepted  
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

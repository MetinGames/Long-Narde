# Nardora Roadmap

Last synchronized: **2026-08-03**

Nardora is the player-facing brand. The repository and existing GitHub Pages URL may remain `Long-Narde` to avoid breaking links.

## How this roadmap stays current

- GitHub Issues are the execution queue; this file is the high-level plan.
- Every implementation issue must have an owner, priority, status, target phase, and acceptance criteria.
- A feature is marked complete only after its tests pass and the change reaches `main`.
- The issue status and this roadmap must be updated in the same change that completes a roadmap item.
- New ideas from testing or project conversations must be recorded as an issue before implementation starts.
- Review the roadmap and open feedback at least once per week.

Status key: **Done**, **In progress**, **Queued**, **Research**.

## Verified baseline — Done

- Local human-versus-bot Long Narde gameplay.
- Core rules and regressions: maximum dice use, higher-die rule, special opening doubles, six-point prime restriction, black wraparound, bearing off, undo, and win detection.
- Multi-die one-click movement when a legal combined route exists.
- Start screen that pauses gameplay until the player starts a match.
- Turkish, English, and Russian interface flow with synchronized selectors.
- Turn confirmation, move-by-move undo, double-dice rights indicators, active-turn feedback, collected-checker tray, and victory feedback.
- Per-turn timeout reset and two-stage timeout flow.
- Local player statistics, how-to-play guide, feedback modal, and GitHub issue forms.
- Runtime diagnostics export for player bug reports.
- Responsive desktop/mobile layouts, iOS safe-area handling, orientation guidance, and fullscreen/focus mode.
- Installable PWA shell with versioned updates and offline local bot play.
- Anadolu and walnut themes.
- Automated GitHub Actions test workflow.
- Player-facing Nardora migration across the page title, welcome flow, TR/EN/RU copy, and splash experience.
- Optional Quick Bear-Off that acts only when the legal continuation is unambiguous.
- Champion bot mode with deterministic multi-move planning and callback safety.
- Automatic pass when no legal move exists, without starting a stale human timer.
- Licensed sampled dice and checker sounds integrated as a review baseline; final original recordings remain planned.
- Provider-neutral private-table v1 contract with deterministic in-memory room, invite, presence, reconnect, authority, and safety seams.
- Versioned, resettable on-device player identity with 15 built-in avatars, four local achievements, richer bot-difficulty statistics, and an exact private-table identity projection.
- Honest same-device Friend Match lifecycle preview with localized room/invite/join/ready/disconnect/resume/leave/close states while the real hosted mode remains disabled.
- **294 automated tests passing as of 2026-08-03.**

## Current gaps and risks

- `app.js` is 1,396 lines after local Friend Match composition; `engine/renderer.js` remains about 1,181 lines and `style.css` 3,543 lines after the responsive preview layer. The focused preview behavior and listeners live in `friendMatchPreviewController.js`; further extraction remains evidence-driven.
- The repository has 35 non-main remote branches that need a verified merged/stale inventory before deletion.
- Phase 0 and priority Phase 1 work now exists as measurable GitHub Issues; the unified Project view and milestones remain queued in [#8](https://github.com/MetinGames/Long-Narde/issues/8).
- Community-sourced sample sounds are integrated and licensed, but Metin's final original dice/checker recordings, volume controls, and device-level listening review are not complete.
- The how-to-play guide is static; there is no contextual rule explanation system or interactive first-match tutorial yet.
- Friend Match and Online have honest entry points, local identity, a provider-neutral contract, and a player-facing same-device lifecycle preview, but no network adapter, approved account model, hosted backend, or playable online table; theme selection is not yet a dedicated visual management screen.
- Advertising-safe responsive zones and Yandex-specific layout behavior have not been designed or tested.
- There is no store package, backend, account system, online room, chat, ranking, or moderation layer.

## Active 14-day worklist — 2026-08-03 to 2026-08-16

1. **Research completed — [#19](https://github.com/MetinGames/Long-Narde/issues/19):** compared Supabase, Firebase, and Cloudflare Durable Objects across authority, privacy, cost, regional latency, limits, export, and lock-in. Supabase is the preferred synthetic-trial candidate; no project, spend, personal data, or provider commitment is authorized.
2. **Completed — [#15](https://github.com/MetinGames/Long-Narde/issues/15):** delivered the versioned local profile, 15 built-in avatars, achievements, richer difficulty statistics, migration/reset behavior, and exact private-table identity projection.
3. **Completed — [#16](https://github.com/MetinGames/Long-Narde/issues/16):** delivered the provider-neutral private-table v1 contract, deterministic in-memory adapter, reconnect snapshots, authoritative outcome boundary, and safety seams.
4. **Completed — [#18](https://github.com/MetinGames/Long-Narde/issues/18):** connected local identity and the v1 in-memory adapter to an honest, localized, lifecycle-safe same-device Friend Match preview while preserving the disabled hosted entry.
5. **Completed — [#10](https://github.com/MetinGames/Long-Narde/issues/10):** replaced the single start action with an honest, responsive mode entry; Quick Play and Bot Match work, while Friend Match and Online remain visibly disabled until real flows exist.
6. **Parallel support — [#8](https://github.com/MetinGames/Long-Narde/issues/8) and [#6](https://github.com/MetinGames/Long-Narde/issues/6):** configure project metadata and inventory branches without blocking the social critical path or deleting unverified work.
7. **Hosted approval gate:** [#20](https://github.com/MetinGames/Long-Narde/issues/20) remains blocked until Metin explicitly approves the candidate provider, EU region, minimal data map, retention, and any spend after reviewing [#19](https://github.com/MetinGames/Long-Narde/issues/19).

Completed in this synchronization cycle:

- [#2](https://github.com/MetinGames/Long-Narde/issues/2) Issue/ROADMAP synchronization workflow established and closed.
- [#3](https://github.com/MetinGames/Long-Narde/issues/3) Playwright cross-browser/mobile coverage verified and closed.
- [#5](https://github.com/MetinGames/Long-Narde/issues/5) installable/offline PWA foundation delivered with focused lifecycle and offline-play tests.
- [#4](https://github.com/MetinGames/Long-Narde/issues/4) two focused `app.js` lifecycle/listener slices delivered with explicit ownership and cleanup tests.
- [#10](https://github.com/MetinGames/Long-Narde/issues/10) honest, localized and responsive mode entry delivered with working local choices and native-disabled social previews.
- [#16](https://github.com/MetinGames/Long-Narde/issues/16) versioned room/invite/presence/reconnect contract delivered with idempotency, ordering, stale-session and trusted-outcome tests.
- [#15](https://github.com/MetinGames/Long-Narde/issues/15) device-only identity, built-in avatars, progression v2 migration, achievements, reset controls, and private-table projection delivered.
- [#18](https://github.com/MetinGames/Long-Narde/issues/18) local Friend Match preview delivered with controller-owned listeners/subscriptions, full local lifecycle, stale-callback protection, reconnect recovery, honest copy, and responsive TR/EN/RU UI.
- [#19](https://github.com/MetinGames/Long-Narde/issues/19) provider research completed with a weighted comparison, cost model, minimal data map, exit paths, synthetic-trial plan, and measurable rejection criteria; provider commitment remains open.
- No open pull request or new GitHub player-feedback submission requires triage; closed draft PR [#7](https://github.com/MetinGames/Long-Narde/pull/7) is superseded by the Nardora work already delivered to `main`.

## Phase 0 — Product exit gate met; maintenance continues

Target: **2026-08-14**

- **Done:** Complete the player-facing Nardora migration without changing the repository or GitHub Pages URL.
- **Done:** Establish and run the Issue/ROADMAP synchronization workflow; recurring weekly review continues under the documented operating loop.
- **Queued:** Configure the unified GitHub Project view, milestones, and workflow metadata in [#8](https://github.com/MetinGames/Long-Narde/issues/8); the approved priority Phase 1 backlog now exists as Issues.
- **Queued:** Inventory all 35 non-main branches in [#6](https://github.com/MetinGames/Long-Narde/issues/6) and remove only branches proven merged or obsolete after Metin approves the exact cleanup list.
- **Done:** Complete the focused [#4](https://github.com/MetinGames/Long-Narde/issues/4) checkpoint: resume and mobile-theme event ownership are idempotent, removable and test-backed.
- **Done:** Playwright CI covers Chromium, Firefox, WebKit, iPhone 16e portrait, iPhone 17 Pro Max landscape, fullscreen/focus fallback, orientation transitions, and stable high-value visual baselines.
- **Done:** Added a small PWA foundation with app manifest, original Nardora icons, conservative versioned updates, installability metadata, and offline local bot play.
- **Research:** Measure move-search cost, memoization effectiveness, JSON state-copy cost, Web Worker need, and audio/image preload behavior before optimizing.

Exit criteria:

- Nardora is the visible product name everywhere.
- The active work queue exists as GitHub Issues and matches this roadmap.
- Unit tests and cross-browser smoke tests pass in CI.
- The game is installable as a basic PWA and remains playable offline against the bot.

All four product exit criteria are met. Project/milestone configuration and branch inventory remain useful maintenance work, not blockers on Phase 1 delivery.

## Social-platform critical path

1. **Entry — Done:** [#10](https://github.com/MetinGames/Long-Narde/issues/10) gives every current and future mode an honest place in the product journey.
2. **Identity seam — Done:** [#15](https://github.com/MetinGames/Long-Narde/issues/15) establishes local, resettable identity and built-in avatars without collecting remote personal data.
3. **Private-table contract — Done:** [#16](https://github.com/MetinGames/Long-Narde/issues/16) defines room lifecycle, invites, presence, authoritative commands/events and reconnect snapshots with an in-memory test adapter.
4. **Client vertical slice — Done:** [#18](https://github.com/MetinGames/Long-Narde/issues/18) connects the proven contract and device identity to an honest local Friend Match controller without presenting it as online play.
5. **Hosted evidence — Done; approval gated:** [#19](https://github.com/MetinGames/Long-Narde/issues/19) records provider/privacy/cost evidence and recommends Supabase only as the first synthetic-trial candidate. Only after explicit provider/data/region/spend approval may [#20](https://github.com/MetinGames/Long-Narde/issues/20) connect the contract to managed auth/realtime infrastructure.
6. **Safe communication and community:** add text/emoji with leave, mute, block, report and rate limits; voice/video, rankings and groups follow only after the safety and operations layer is proven.

Distribution and local-game quality proceed in parallel. No social milestone may weaken rule authority, mobile reliability, privacy defaults or honest availability states.

## Phase 1 — Active: social-ready local game and launch candidate

Target: **2026-09-30**

- **Done:** Replaced the single start action with the honest mode entry in [#10](https://github.com/MetinGames/Long-Narde/issues/10); Quick Play/Bot Match work now, while Friend Match/Online expose accurate future availability.
- **Done:** Defined and tested the provider-neutral private-table foundation in [#16](https://github.com/MetinGames/Long-Narde/issues/16), including lifecycle, invites, idempotency, ordering, reconnect snapshots, actor-scoped safety seams, and authoritative command/event boundaries.
- **Done:** Built local identity/profile seams in [#15](https://github.com/MetinGames/Long-Narde/issues/15) without remote personal-data collection, using the v1 table identity projection and a separately resettable progression v2 store.
- **Done:** Built the local Friend Match client vertical slice in [#18](https://github.com/MetinGames/Long-Narde/issues/18), including the full same-device lifecycle, disconnect/resume recovery, honest availability boundary, and accessible responsive copy in all three languages.
- **Done:** Evaluated provider, privacy, cost, regional latency, limits, export, and lock-in evidence in [#19](https://github.com/MetinGames/Long-Narde/issues/19). Supabase leads only the synthetic trial; Cloudflare Durable Objects is the fallback and no provider is committed.
- **Approval gated:** Keep the hosted adapter [#20](https://github.com/MetinGames/Long-Narde/issues/20) blocked until Metin explicitly approves the provider, EU region, minimal data map, retention, and any spend.
- Integrate the user's original high-quality dice and checker recordings, with volume controls and safe preload behavior ([#12](https://github.com/MetinGames/Long-Narde/issues/12)).
- Benchmark and refine the shipped Champion bot against representative positions and Metin's real matches; move heavy calculation to a Web Worker only if measurements justify it ([#11](https://github.com/MetinGames/Long-Narde/issues/11)).
- Build a contextual **Rule Explanation System** that explains why a move is legal, blocked, mandatory, or automatically passed ([#9](https://github.com/MetinGames/Long-Narde/issues/9)).
- Add an **Interactive First-Match Tutorial** for the distinctive Long Narde rules, using the existing guide as its reference source (combined with [#9](https://github.com/MetinGames/Long-Narde/issues/9)).
- Build a visual theme-management screen and prepare approved Anatolian theme families without weakening board readability ([#14](https://github.com/MetinGames/Long-Narde/issues/14)).
- Polish onboarding, victory flow, active-player cues, touch targets, and accessibility; validate the release gate on real devices ([#13](https://github.com/MetinGames/Long-Narde/issues/13)).
- Keep competitor/rival analysis as a research input for clarity, onboarding, retention, and monetization patterns; do not copy protected art or branding.
- Run real-device tests on representative iPhone, Android, tablet, and desktop screen sizes ([#13](https://github.com/MetinGames/Long-Narde/issues/13)).
- Define release quality gates: no known critical rule bug, no layout overflow, tests green, diagnostics available, and asset licenses recorded.

## Phase 2 — Distribution

Targets: **Yandex candidate 2026-11-30; Android beta 2027-01-31; iOS beta 2027-03-31**

- Add Yandex Games SDK integration, pause/focus behavior, localization, save policy, and submission assets.
- Reserve and test advertising-safe responsive zones so monetization never covers the board, dice, timer, confirmation, undo, or accessibility controls.
- Package the existing web game with Capacitor for Android and iOS rather than rewriting the game.
- Add app icons, splash screens, privacy disclosures, store screenshots, descriptions, age rating, and release notes.
- Test Android lifecycle/back-button behavior and iOS foreground/background, safe-area, rotation, audio, and WKWebView behavior.
- Prepare Google Play testing and App Store/TestFlight delivery. iOS publishing requires a supported Mac/Xcode environment and Apple Developer access.

## Phase 3 — Online private tables

Target: **2027-05-31**

- Add accounts, authenticated profiles, and cloud-synced statistics.
- Implement private rooms, invite links, presence, reconnect/resume, and deterministic game-state synchronization.
- Validate all online moves with an authoritative service; never trust client-reported wins, scores, or dice.
- Add written chat and quick emojis with blocking, reporting, and rate limits.
- Add observability, backups, abuse controls, and load tests before public matchmaking.

## Phase 4 — Social Nardora

Target: **2027-09-30**

- Add opt-in voice and video rooms; camera and microphone remain off by default.
- Keep mute, camera-off, leave-table, block, and report controls immediately accessible.
- Add ranking, rating, country/group/clan leaderboards, seasons, and match history.
- Add privacy controls for profile sharing, avatar/photo moderation, chat moderation, and sanctions/appeals.
- Harden reconnect, anti-cheat, account recovery, deletion/export requests, and operational monitoring.

## Schedule range

- Strong Nardora web/PWA release: **2026-09-30**.
- Provider-neutral private-table contract and local vertical slice: **2026-09-30**.
- Yandex submission candidate: **2026-11-30**.
- Hosted invite-only private-table alpha: **2027-01-31**, subject to provider and privacy approval.
- Android beta: **2027-01-31**.
- iOS beta: **2027-03-31**.
- Online private-table beta: **2027-05-31**.
- Full social roadmap target: **2027-09-30**.
- Safety buffer for store review, real-device defects, networking, and moderation: **2027-12-31**.

These dates assume focused weekly execution, small pull requests, automated tests, and use of managed services for hosting, authentication, realtime messaging, and media rather than building those systems from zero.

## Tooling decisions

### Use now

- **GitHub Projects + Issues:** the synchronized execution board and roadmap timeline.
- **GitHub Actions:** keep unit tests mandatory; add browser smoke tests and scheduled security checks.
- **Playwright:** cross-browser, touch/mobile emulation, and screenshot regression coverage.
- **Dependabot + CodeQL:** dependency and JavaScript/security scanning.
- **Sentry or equivalent:** production JavaScript error monitoring; avoid duplicating the existing local diagnostics report.

### Use when external testing grows

- **PostHog or equivalent:** privacy-conscious product analytics, funnels, and carefully masked session replay.
- **Preview deployments:** a separate URL for each pull request so testers do not have to wait for changes to reach the production GitHub Pages link.
- **Real-device cloud testing:** only after Playwright emulation no longer covers device-specific failures.

### Use for online and social phases

- **Supabase or equivalent managed backend:** authentication, Postgres, presence, room metadata, and realtime events.
- **Server/edge validation:** authoritative dice, legal moves, results, ratings, and anti-cheat checks.
- **LiveKit or equivalent managed WebRTC service:** optional voice/video instead of operating raw WebRTC infrastructure ourselves.
- **Capacitor:** one web-first codebase packaged for Android and iOS.

### Do not add yet

- A JavaScript framework rewrite, custom game server, custom video infrastructure, or AI API calls from the browser. They add risk without solving the current bottlenecks; secrets must never be shipped in client code.

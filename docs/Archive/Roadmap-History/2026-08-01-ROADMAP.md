# Nardora Roadmap

Last synchronized: **2026-08-01**

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
- Anadolu and walnut themes.
- Automated GitHub Actions test workflow.
- **152 automated tests passing as of 2026-08-01.**

## Current gaps and risks

- The interface still exposes `Classic Long Narde` / `Welcome to Long Narde`; the Nardora brand migration is not implemented.
- `app.js` is about 1,017 lines, `engine/renderer.js` about 1,181 lines, and `style.css` about 2,373 lines; modularization is only partly complete.
- The repository has 27 non-main branches that need a verified merged/stale inventory before deletion.
- The first six sprint Issues now exist; a GitHub Project view, milestones, and the remaining Phase 1 backlog still need configuration.
- The sound folders are placeholders; the requested real dice/checker recordings are not integrated.
- The UI exposes Easy, Medium, and Master. A separate Champion mode is not present in the current code.
- There is no PWA manifest/service worker, store package, backend, account system, online room, chat, ranking, or moderation layer.

## Phase 0 — Active sprint: synchronization and delivery safety

Target: **2026-08-14**

- **In progress:** Replace the stale roadmap with this verified, dated plan.
- **In progress:** Phase 0 work now exists as six prioritized GitHub Issues with estimates and acceptance criteria; create the Project view and remaining Phase 1 backlog.
- **Queued:** Complete player-facing Nardora migration in HTML title, TR/EN/RU translations, welcome screen, feedback text, and documentation without changing the repository URL.
- **Queued:** Inventory all 27 non-main branches and remove only branches proven merged or obsolete.
- **In progress:** Continue small, test-backed extraction from `app.js`; review UI/core ownership and event-listener lifecycle.
- **Queued:** Add Playwright smoke and visual-regression tests for Chromium, Firefox, WebKit, touch, portrait, and landscape layouts.
- **Queued:** Add a small PWA foundation: app manifest, icons, service worker, installability, and offline local play.
- **Research:** Measure move-search cost, memoization effectiveness, JSON state-copy cost, Web Worker need, and audio/image preload behavior before optimizing.

Exit criteria:

- Nardora is the visible product name everywhere.
- The active work queue exists as GitHub Issues and matches this roadmap.
- Unit tests and cross-browser smoke tests pass in CI.
- The game is installable as a basic PWA and remains playable offline against the bot.

## Phase 1 — Strong local game and launch candidate

Target: **2026-09-30**

- Integrate the user's original high-quality dice and checker recordings, with volume controls and safe preload behavior.
- Build and benchmark Champion bot search with multi-move planning; move heavy calculation to a Web Worker only if measurements justify it.
- Add optional **Quick Bear-Off**: auto-execute only when the legal continuation is unambiguous; keep player choice whenever alternatives matter.
- Finish profile card, local avatar selection, achievements, and richer local statistics.
- Polish onboarding, victory flow, active-player cues, touch targets, and accessibility.
- Run real-device tests on representative iPhone, Android, tablet, and desktop screen sizes.
- Define release quality gates: no known critical rule bug, no layout overflow, tests green, diagnostics available, and asset licenses recorded.

## Phase 2 — Distribution

Targets: **Yandex candidate 2026-11-30; Android beta 2027-01-31; iOS beta 2027-03-31**

- Add Yandex Games SDK integration, pause/focus behavior, localization, save policy, and submission assets.
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
- Yandex submission candidate: **2026-11-30**.
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

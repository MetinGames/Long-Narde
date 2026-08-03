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
- **240 automated tests passing as of 2026-08-03.**

## Current gaps and risks

- `app.js` is about 1,314 lines, `engine/renderer.js` about 1,181 lines, and `style.css` about 2,525 lines; recent features increased orchestration and styling pressure while modularization remains incomplete.
- The repository has 35 non-main remote branches that need a verified merged/stale inventory before deletion.
- Phase 0 and priority Phase 1 work now exists as measurable GitHub Issues; the unified Project view and milestones remain queued in [#8](https://github.com/MetinGames/Long-Narde/issues/8).
- Community-sourced sample sounds are integrated and licensed, but Metin's final original dice/checker recordings, volume controls, and device-level listening review are not complete.
- The how-to-play guide is static; there is no contextual rule explanation system or interactive first-match tutorial yet.
- The start flow does not yet provide the approved minimal mode menu, and theme selection is not yet a dedicated visual management screen.
- Advertising-safe responsive zones and Yandex-specific layout behavior have not been designed or tested.
- There is no store package, backend, account system, online room, chat, ranking, or moderation layer.

## Active 14-day worklist — 2026-08-03 to 2026-08-16

1. **Active — [#4](https://github.com/MetinGames/Long-Narde/issues/4):** browser resume-event ownership is extracted and mapped; continue with the compact mobile theme-label listener slice while keeping 240+ unit tests and relevant Playwright smoke tests green.
2. **Completed — [#5](https://github.com/MetinGames/Long-Narde/issues/5):** delivered the conservative installable/offline PWA foundation with predictable cache updates.
3. **Queued — [#8](https://github.com/MetinGames/Long-Narde/issues/8):** configure the unified GitHub Project view, Phase 0/1 milestones, and lightweight workflow metadata.
4. **Queued — [#6](https://github.com/MetinGames/Long-Narde/issues/6):** classify all 35 non-main branches; prepare an approval list but delete nothing.
5. **Phase 1 ready — [#9](https://github.com/MetinGames/Long-Narde/issues/9):** begin contextual rule explanations and the interactive first-match tutorial only after the Phase 0 exit gate is met.

Completed in this synchronization cycle:

- [#2](https://github.com/MetinGames/Long-Narde/issues/2) Issue/ROADMAP synchronization workflow established and closed.
- [#3](https://github.com/MetinGames/Long-Narde/issues/3) Playwright cross-browser/mobile coverage verified and closed.
- [#5](https://github.com/MetinGames/Long-Narde/issues/5) installable/offline PWA foundation delivered with focused lifecycle and offline-play tests.
- No open pull request or new GitHub player-feedback submission requires triage; closed draft PR [#7](https://github.com/MetinGames/Long-Narde/pull/7) is superseded by the Nardora work already delivered to `main`.

## Phase 0 — Active sprint: synchronization and delivery safety

Target: **2026-08-14**

- **Done:** Complete the player-facing Nardora migration without changing the repository or GitHub Pages URL.
- **Done:** Establish and run the Issue/ROADMAP synchronization workflow; recurring weekly review continues under the documented operating loop.
- **Queued:** Configure the unified GitHub Project view, milestones, and workflow metadata in [#8](https://github.com/MetinGames/Long-Narde/issues/8); the approved priority Phase 1 backlog now exists as Issues.
- **Queued:** Inventory all 35 non-main branches in [#6](https://github.com/MetinGames/Long-Narde/issues/6) and remove only branches proven merged or obsolete after Metin approves the exact cleanup list.
- **In progress:** Continue small, test-backed extraction from `app.js` in [#4](https://github.com/MetinGames/Long-Narde/issues/4); resume-event ownership now has an idempotent controller and the remaining listener boundaries are mapped.
- **Done:** Playwright CI covers Chromium, Firefox, WebKit, iPhone 16e portrait, iPhone 17 Pro Max landscape, fullscreen/focus fallback, orientation transitions, and stable high-value visual baselines.
- **Done:** Added a small PWA foundation with app manifest, original Nardora icons, conservative versioned updates, installability metadata, and offline local bot play.
- **Research:** Measure move-search cost, memoization effectiveness, JSON state-copy cost, Web Worker need, and audio/image preload behavior before optimizing.

Exit criteria:

- Nardora is the visible product name everywhere.
- The active work queue exists as GitHub Issues and matches this roadmap.
- Unit tests and cross-browser smoke tests pass in CI.
- The game is installable as a basic PWA and remains playable offline against the bot.

## Phase 1 — Strong local game and launch candidate

Target: **2026-09-30**

- Integrate the user's original high-quality dice and checker recordings, with volume controls and safe preload behavior ([#12](https://github.com/MetinGames/Long-Narde/issues/12)).
- Benchmark and refine the shipped Champion bot against representative positions and Metin's real matches; move heavy calculation to a Web Worker only if measurements justify it ([#11](https://github.com/MetinGames/Long-Narde/issues/11)).
- Build a contextual **Rule Explanation System** that explains why a move is legal, blocked, mandatory, or automatically passed ([#9](https://github.com/MetinGames/Long-Narde/issues/9)).
- Add an **Interactive First-Match Tutorial** for the distinctive Long Narde rules, using the existing guide as its reference source (combined with [#9](https://github.com/MetinGames/Long-Narde/issues/9)).
- Replace the single start action with a minimal mode menu: Quick Play, Bot Match, Friend Match, Online, and How to Play; keep unavailable future modes clearly marked instead of starting fake flows ([#10](https://github.com/MetinGames/Long-Narde/issues/10)).
- Build a visual theme-management screen and prepare approved Anatolian theme families without weakening board readability ([#14](https://github.com/MetinGames/Long-Narde/issues/14)).
- Finish profile card, local avatar selection, achievements, and richer local statistics ([#15](https://github.com/MetinGames/Long-Narde/issues/15)).
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

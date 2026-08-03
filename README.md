# Nardora

Kısa Türkçe özet: Nardora; Anadolu temasına sahip, yerel tek oyunculu bir uzun narde deneyimidir. Oyuncuya görünen marka Nardora'dır; `Long-Narde` depo adı ve mevcut GitHub Pages adresi bağlantıları bozmamak için korunur.

Live game: https://metingames.github.io/Long-Narde/

## Project overview

Long Narde is a static, installable browser-based long narde game with a local human player, a bot opponent, offline play, turn timer handling, a local profile and progression center, a how-to-play guide, and responsive UI support for desktop and mobile layouts. The codebase is organized around a small app bootstrap and a set of focused engine modules that handle game rules, rendering, input, UI state, feedback, timing, identity, statistics, themes, internationalization, and a provider-neutral private-table contract.

## Current status

The current repository contains a playable local single-player game against a bot. The start screen pauses gameplay until the user chooses Quick Play or Bot Match, exposes the bot difficulty before play, and keeps the real Friend Match and Online entries visibly unavailable. A separate **Local Table Preview** demonstrates the private-table lifecycle on one device without claiming that networking or online play exists. Language selection is available both on the start screen and in the side panel, and both controls stay synchronized through the shared i18n/localStorage flow. The current implementation also includes a local profile with 15 built-in avatars, achievements, difficulty-based statistics, a how-to-play modal, restart protection, Champion difficulty, optional Quick Bear-Off, automatic no-legal-move passing, sampled dice/checker audio, multiple feedback helpers, and a tested in-memory private-table protocol foundation.

This project is not documented here as having online multiplayer, user accounts, cloud sync, ranked matchmaking, or a backend service.

## Main features

- Local human-vs-bot long narde gameplay.
- Honest mode-entry screen with working Quick Play/Bot Match choices, synchronized difficulty, disabled Friend Match/Online entries, and an explicitly local same-device table-flow preview.
- Start-screen language, how-to-play, profile/progression, and feedback entry points.
- Shared Turkish, English, and Russian interface support.
- Turn timer and timeout handling.
- Versioned local identity with a resettable nickname and 15 built-in avatars.
- Local achievements, streaks, averages, and bot-difficulty statistics stored in browser storage.
- How-to-play modal and accessible profile/progression modal.
- Responsive layouts for desktop, portrait mobile, and landscape mobile.
- Theme selection with an Anadolu visual theme and an alternate walnut theme.
- Easy, Medium, Master, and Champion bot difficulty levels.
- Optional Quick Bear-Off when the continuation is unambiguous.
- Licensed sampled dice/checker audio with safe preload and event de-duplication.
- Installable PWA shell with offline local bot play and versioned cache updates.
- Versioned private-table command/event contract with deterministic in-memory invite, presence, reconnect, authority, and safety seams.
- Lifecycle-safe local Friend Match preview controller covering room creation, invite, join, ready, active, disconnect, resume, leave, and close without networking or trusted game outcomes.

## Supported languages

- Türkçe
- English
- Русский

The language names are kept fixed in the UI regardless of the active interface language.

## Nardora rules and important differences

Long Narde in this repository follows the long narde rules implemented in the code, not classic backgammon capture rules.

- Each player starts with 15 pieces on a head position: slot 1 for White and slot 13 for Black.
- White advances in the forward direction from 1 toward 24.
- Black advances in the forward direction from 13 toward 24, then wraps through 1 and continues toward 12.
- A checker may be borne off only when all pieces are in the home board.
- Exact dice are allowed for bearing off, and a larger die is allowed only when the rule permits it and no farther checker blocks that bear-off.
- The code rejects moves onto an opponent-occupied point.
- The code does not implement a hit, bar, or piece-breaking mechanic.
- A player may move from the head only within the configured head-move limit.
- Special opening doubles 3-3, 4-4, and 6-6 allow two head moves on the first turn; otherwise the head move limit is one.

## Controls and turn flow

- Quick Play begins immediately with the current bot settings; Bot Match exposes the synchronized difficulty selector before starting.
- Friend Match and Online remain disabled and labelled as upcoming until their real hosted flows exist. **Local Table Preview** is a separate same-device state simulation; it does not start an online or bot match.
- The language selects on the start screen and side panel update the same i18n state.
- The bot-difficulty select changes the bot level before or during play.
- Undo reverts the current turn where allowed.
- End Turn finalizes the human turn when no playable dice remain.
- The turn timer counts down only after the game has started and the human turn is active.

## Bot difficulty levels

The code exposes four difficulty labels in the UI: Easy, Medium, Master, and Champion. Champion evaluates complete legal move sequences deterministically and is regression-tested for dice-use, prime, bearing-off, callback-safety, and performance constraints. It receives no hidden rule or dice advantage.

## Timer and timeout behaviour

The timeout system is managed by the engine layer with absolute deadlines. The human turn timer is initialized per turn, first timeout warnings are possible in casual mode, and a later absolute forfeit window can end the game if time expires again. The start screen does not start the timer, deadline, or bot turn logic.

## Local profile and progression

The profile and progression center stores all data on the current device. The versioned identity model contains only a generated local ID, a bounded player nickname, and one of 15 approved built-in avatar IDs. It does not upload a name, photo, email, phone number, location, result, or rating.

Statistics use a v2 schema that migrates existing v1 totals without data loss. The current model includes total matches, wins, losses, moves, best win, average moves, current/best win streak, normal/timeout losses, and win/match records for Easy, Medium, Master, and Champion. Four local achievements are derived and persisted from these records. Profile reset changes only identity; statistics have a separate confirmed reset.

`engine/playerIdentity.js` exposes an exact `{ id, displayName, avatarId }` projection for the private-table contract. Achievements and local statistics never enter that projection and are not trusted as online outcomes. See [LOCAL_PLAYER_PROFILE.md](docs/LOCAL_PLAYER_PROFILE.md).

## Local Friend Match preview

The start screen exposes a separate **Local Table Preview** below the unavailable social modes. It uses the current device profile as the host and a fixed built-in simulated friend identity, then walks through the provider-neutral v1 protocol states. Its controller owns dialog, keyboard, subscription, cleanup, stale-callback, reconnect-token, and translation refresh behavior.

The preview runs only in page memory. It sends no network request, creates no account or shareable invite link, uploads no personal data, and never fabricates authoritative dice, moves, results, scores, or ratings. The real Friend Match button remains disabled. See [LOCAL_FRIEND_MATCH_PREVIEW.md](docs/LOCAL_FRIEND_MATCH_PREVIEW.md).

## Responsive/mobile support

The UI includes mobile media queries for portrait and landscape layouts, safe-area-aware spacing, and compact controls that preserve readability on small screens. The project also includes tests that verify responsive CSS markers and important modal/overlay IDs.

## Technology stack

- Plain JavaScript modules.
- Native browser DOM APIs.
- HTML5 Canvas rendering.
- CSS for responsive layout and theming.
- Node.js built-in test runner for automated verification.
- Playwright for Chromium, Firefox, WebKit, and mobile/touch smoke testing.
- Web App Manifest and a dependency-free service worker for installation and offline play.

## PWA and offline updates

The service worker precaches only the files required to open Nardora and play against the local bot. Installation is atomic: if a required file cannot be cached, the previous working service worker remains active. A waiting update is activated on the next page load and then reloads once under the new cache, avoiding a mid-match version switch.

When a precached app-shell file changes, increment `CACHE_VERSION` in `service-worker.js`. The focused PWA tests verify that every listed cache path exists, every engine module is covered, the manifest has 192×192 and 512×512 icons, and old Nardora caches are removed without touching unrelated browser caches.

## Verified project structure

Verified top-level structure:

- `app.js`
- `index.html`
- `manifest.webmanifest`
- `package.json`
- `service-worker.js`
- `style.css`
- `assets/`
- `engine/`
- `scripts/`
- `tests/`

Verified engine modules currently present:

- `engine/animations.js`
- `engine/appResumeController.js`
- `engine/assets.js`
- `engine/board.js`
- `engine/bot.js`
- `engine/botMoveFeedback.js`
- `engine/botTurnTouchFeedback.js`
- `engine/dice.js`
- `engine/friendMatchPreviewController.js`
- `engine/game.js`
- `engine/gameFeedbackToast.js`
- `engine/howToPlayGuide.js`
- `engine/i18n.js`
- `engine/input.js`
- `engine/layout.js`
- `engine/languageSelectors.js`
- `engine/mobileThemeLabelController.js`
- `engine/playerStats.js`
- `engine/playerStatsModal.js`
- `engine/privateTableProtocol.js`
- `engine/pwa.js`
- `engine/renderer.js`
- `engine/restartButtonLock.js`
- `engine/startModeController.js`
- `engine/themes.js`
- `engine/timeoutController.js`
- `engine/uiManager.js`
- `engine/undoActionButtons.js`
- `engine/victoryMoment.js`

Verified test files currently present:

- `tests/app-resume-controller.test.js`
- `tests/core-rules.test.js`
- `tests/game-feedback-toast.test.js`
- `tests/gameplay-feedback.test.js`
- `tests/friend-match-preview-controller.test.js`
- `tests/how-to-play-guide.test.js`
- `tests/i18n.test.js`
- `tests/input-feedback-integration.test.js`
- `tests/input.test.js`
- `tests/layout.test.js`
- `tests/language-selectors.test.js`
- `tests/mobile-theme-label-controller.test.js`
- `tests/player-identity.test.js`
- `tests/player-stats-modal.test.js`
- `tests/player-stats.test.js`
- `tests/private-table-protocol.test.js`
- `tests/pwa.test.js`
- `tests/renderer-theme-storage.test.js`
- `tests/responsive.test.js`
- `tests/start-mode-controller.test.js`
- `tests/sync-main.test.js`
- `tests/timeout-deadlines.test.js`
- `tests/undo-action-buttons.test.js`
- `tests/victory-moment.test.js`
- `tests/visual-feedback.test.js`

## Local installation and running

The repository does not declare runtime dependencies in `package.json`, so there is no application build step to install here.

To run the project locally:

1. Open the repository in a recent Node.js-enabled environment.
2. Serve the folder with a static web server or open it in a browser environment that supports ES modules.
3. Open `index.html` to play the game.

To run tests:

- Windows: `npm.cmd test`
- Cross-platform: `npm test`

### Safe VS Code synchronization

Opening the repository in VS Code offers the workspace task **Nardora: main ile güvenli eşitle**. After automatic tasks are allowed for the trusted workspace, it runs on folder open; it can also be started manually from **Terminal → Run Task**. The same check is available from any terminal with `npm run sync:main`.

The task fetches `origin/main` and applies only a clean fast-forward. It never switches branches, overwrites uncommitted work, pushes local commits, or resolves divergent history automatically; those situations stop with an explanatory message.

To list or run the Playwright browser suite:

- List configured tests and devices: `npm run test:e2e:list`
- Run all browser projects: `npm run test:e2e`
- Install required local browsers first when needed: `npx playwright install chromium firefox webkit`

## Architecture overview

`app.js` is the bootstrap and orchestration layer. It creates the game, renderer, bot, UI manager, and support helpers, then wires DOM events and start-screen flow. The `engine/` folder contains the core game model, board rules, bot logic, rendering logic, timeout controller, i18n, local identity/statistics, feedback helpers, the provider-neutral private-table protocol, and the local Friend Match preview controller. The `tests/` folder mirrors these responsibilities with focused behavioral and regression tests.

The app uses the same i18n system for the start screen and the side panel. Language changes update the DOM immediately and are persisted through localStorage. `engine/startModeController.js` owns the available and unavailable mode listeners, prevents duplicate starts, and exposes explicit reset/cleanup lifecycle methods.

## Accessibility

The current UI includes aria labels, aria-live status updates, modal dialog semantics, keyboard navigation and focus containment inside the how-to-play, profile/progression, and local table preview dialogs, visible focus states, and touch-sized avatar controls. The mode menu is an explicitly labelled group; unavailable social modes use native disabled buttons and visible status badges. The start-screen language and difficulty controls use visible labels and native select elements so they remain keyboard-friendly.

## Known limitations

- The playable game is local single-player against a bot. The private-table contract, in-memory adapter, and local lifecycle preview are development foundations, not online multiplayer or a backend.
- There is no user account system, profile sync, custom photo upload, or cloud storage.
- There is no built-in leaderboard or matchmaking service.
- The current asset set is small; several asset folders are placeholders only.
- The app currently relies on browser storage for local preferences and statistics.

## Project operating documents

- [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md): product north star, player promise, quality bar, decision filters, risks, and working authority.
- [APP_ORCHESTRATION.md](docs/APP_ORCHESTRATION.md): current `app.js` responsibility and listener-ownership map plus the next safe extraction order.
- [PRIVATE_TABLE_PROTOCOL.md](docs/PRIVATE_TABLE_PROTOCOL.md): versioned room, invite, authority, reconnect, privacy, and safety contract for future Friend Match work.
- [LOCAL_FRIEND_MATCH_PREVIEW.md](docs/LOCAL_FRIEND_MATCH_PREVIEW.md): same-device controller flow, honest availability boundary, lifecycle ownership, and verification coverage.
- [LOCAL_PLAYER_PROFILE.md](docs/LOCAL_PLAYER_PROFILE.md): local identity schema, built-in avatars, progression migration, reset behavior, and private-table projection.
- [DECISION_LOG.md](docs/DECISION_LOG.md): durable product and architecture decisions with unresolved decisions kept visible.
- [ROADMAP.md](ROADMAP.md): verified phases, dates, current gaps, and research-backed open items.
- [TOOLING_STRATEGY.md](docs/TOOLING_STRATEGY.md): phased plugin, service, program and data-access decisions.

## Asset provenance

See [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md) for the current asset inventory and verification status.

## Feedback and contribution

This repository currently documents a local game project rather than a service-backed product. Feedback should focus on code-verified behavior, UI clarity, accessibility, and test coverage. For contribution work, prefer small, test-backed changes that keep the existing rules, themes, and i18n flow intact.

## License status

No LICENSE file is present in the repository at the time of writing. This documentation does not assume an open-source license that is not actually included in the repo.

# Nardora

Kısa Türkçe özet: Long Narde, Anadolu temasına sahip, yerel tek oyunculu uzun narde deneyimidir. Bu depo için oyuncuya görünen güncel marka Nardora'dır; bu dokümantasyon mevcut kodu ve mevcut arayüz adlarını değiştirmez.

Live game: https://metingames.github.io/Long-Narde/

## Project overview

Long Narde is a static, browser-based long narde game with a local human player, a bot opponent, turn timer handling, local player statistics, a how-to-play guide, and responsive UI support for desktop and mobile layouts. The codebase is organized around a small app bootstrap and a set of focused engine modules that handle game rules, rendering, input, UI state, feedback, timing, statistics, themes, and internationalization.

## Current status

The current repository contains a playable local single-player game against a bot. The start screen pauses gameplay until the user begins a match. Language selection is available both on the start screen and in the side panel, and both controls stay synchronized through the shared i18n/localStorage flow. The current implementation also includes local player statistics, a how-to-play modal, restart protection, and multiple feedback helpers for game state changes.

This project is not documented here as having online multiplayer, user accounts, cloud sync, ranked matchmaking, or a backend service.

## Main features

- Local human-vs-bot long narde gameplay.
- Start screen with language, how-to-play, and statistics entry points.
- Shared Turkish, English, and Russian interface support.
- Turn timer and timeout handling.
- Local player statistics stored in browser storage.
- How-to-play modal and player stats modal.
- Responsive layouts for desktop, portrait mobile, and landscape mobile.
- Theme selection with an Anadolu visual theme and an alternate walnut theme.

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

- Start Game begins the first match from the start screen.
- The language selects on the start screen and side panel update the same i18n state.
- The bot-difficulty select changes the bot level before or during play.
- Undo reverts the current turn where allowed.
- End Turn finalizes the human turn when no playable dice remain.
- The turn timer counts down only after the game has started and the human turn is active.

## Bot difficulty levels

The UI exposes four bot levels: Easy, Medium, Master V2, and Champion.

- Easy and Medium keep the lightweight baseline logic.
- Master V2 evaluates complete legal turn plans and models one-step opponent responses across all 21 dice outcomes.
- Champion uses deterministic staged search with iterative deepening, rollout-based lookahead, and cancellation-aware planning.

## Headless benchmark

Run the seeded benchmark separately from the default unit test suite:

```bash
npm run benchmark:bot -- --matches 300 --seed 20260802
```

The benchmark reports win rate, mars rate, average pip difference, and average decision time. It compares Master V2 vs Medium and Champion vs Master V2.

## Timer and timeout behaviour

The timeout system is managed by the engine layer with absolute deadlines. The human turn timer is initialized per turn, first timeout warnings are possible in casual mode, and a later absolute forfeit window can end the game if time expires again. The start screen does not start the timer, deadline, or bot turn logic.

## Local player statistics

Player statistics are stored locally in browser storage under a versioned key. The current stats model includes total matches, wins, losses, total moves, best win moves, normal losses, and timeout losses. The stats modal reads from the local store and does not depend on a backend.

## Responsive/mobile support

The UI includes mobile media queries for portrait and landscape layouts, safe-area-aware spacing, and compact controls that preserve readability on small screens. The project also includes tests that verify responsive CSS markers and important modal/overlay IDs.

## Technology stack

- Plain JavaScript modules.
- Native browser DOM APIs.
- HTML5 Canvas rendering.
- CSS for responsive layout and theming.
- Node.js built-in test runner for automated verification.

## Verified project structure

Verified top-level structure:

- `app.js`
- `index.html`
- `package.json`
- `style.css`
- `assets/`
- `engine/`
- `tests/`

Verified engine modules currently present:

- `engine/animations.js`
- `engine/assets.js`
- `engine/board.js`
- `engine/bot.js`
- `engine/botMoveFeedback.js`
- `engine/botTurnTouchFeedback.js`
- `engine/dice.js`
- `engine/game.js`
- `engine/gameFeedbackToast.js`
- `engine/howToPlayGuide.js`
- `engine/i18n.js`
- `engine/input.js`
- `engine/layout.js`
- `engine/languageSelectors.js`
- `engine/playerStats.js`
- `engine/playerStatsModal.js`
- `engine/renderer.js`
- `engine/restartButtonLock.js`
- `engine/themes.js`
- `engine/timeoutController.js`
- `engine/uiManager.js`
- `engine/undoActionButtons.js`
- `engine/victoryMoment.js`

Verified test files currently present:

- `tests/core-rules.test.js`
- `tests/game-feedback-toast.test.js`
- `tests/gameplay-feedback.test.js`
- `tests/how-to-play-guide.test.js`
- `tests/i18n.test.js`
- `tests/input-feedback-integration.test.js`
- `tests/input.test.js`
- `tests/layout.test.js`
- `tests/language-selectors.test.js`
- `tests/player-stats-modal.test.js`
- `tests/player-stats.test.js`
- `tests/renderer-theme-storage.test.js`
- `tests/responsive.test.js`
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

## Architecture overview

`app.js` is the bootstrap and orchestration layer. It creates the game, renderer, bot, UI manager, and support helpers, then wires DOM events and start-screen flow. The `engine/` folder contains the core game model, board rules, bot logic, rendering logic, timeout controller, i18n, statistics, and feedback helpers. The `tests/` folder mirrors these responsibilities with focused behavioral and regression tests.

The app uses the same i18n system for the start screen and the side panel. Language changes update the DOM immediately and are persisted through localStorage.

## Accessibility

The current UI includes aria labels, aria-live status updates, modal dialog semantics, keyboard navigation inside the how-to-play and stats dialogs, and accessible start-screen controls. The start-screen language selector has a visible label, an aria label, and is a native select element so it remains keyboard-friendly.

## Known limitations

- The game is local single-player against a bot; there is no online multiplayer in the current code.
- There is no user account system, profile sync, or cloud storage.
- There is no built-in leaderboard or matchmaking service.
- The current asset set is small; several asset folders are placeholders only.
- The app currently relies on browser storage for local preferences and statistics.

## Project operating documents

- [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md): product north star, player promise, quality bar, decision filters, risks, and working authority.
- [DECISION_LOG.md](docs/DECISION_LOG.md): durable product and architecture decisions with unresolved decisions kept visible.
- [ROADMAP.md](ROADMAP.md): verified phases, dates, current gaps, and research-backed open items.
- [TOOLING_STRATEGY.md](docs/TOOLING_STRATEGY.md): phased plugin, service, program and data-access decisions.

## Asset provenance

See [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md) for the current asset inventory and verification status.

## Feedback and contribution

This repository currently documents a local game project rather than a service-backed product. Feedback should focus on code-verified behavior, UI clarity, accessibility, and test coverage. For contribution work, prefer small, test-backed changes that keep the existing rules, themes, and i18n flow intact.

## License status

No LICENSE file is present in the repository at the time of writing. This documentation does not assume an open-source license that is not actually included in the repo.
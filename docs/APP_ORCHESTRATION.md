# Nardora app orchestration map

Last reviewed: **2026-08-03**

`app.js` remains Nardora's composition root. It creates the game-facing objects and coordinates engine modules, but durable behavior should move into focused modules when ownership and tests are clear. This map prevents broad rewrites and makes the next extraction order explicit.

## Current responsibilities

| Responsibility | Current owner | Direction |
| --- | --- | --- |
| Construct game, renderer, bot, UI, sound, statistics, and diagnostics | `app.js` | Keep as composition-root work |
| Schedule callbacks and invalidate stale session work | `app.js` + `appRuntimeState.js` | Candidate for a later runtime-task controller |
| Start, restart, and terminate local matches | `app.js` | Keep until lifecycle tests isolate a safe boundary |
| Human turn, timeout, auto-pass, and Quick Bear-Off coordination | `app.js` + focused engine controllers | Extract only one proven flow at a time |
| Automatic dice roll and bot-turn sequencing | `app.js` + animation/bot callback modules | Preserve behavior; extract after callback ownership review |
| Victory and game-over orchestration | `app.js` + victory/statistics modules | Candidate after end-state integration tests expand |
| Slot selection and move application | `app.js` + game/input modules | Rule-sensitive; leave until its boundary is fully characterized |
| Modal, language, fullscreen, feedback, and control assembly | `app.js` + focused UI modules | Keep assembly in `app.js`; controllers own their listeners |
| Resume synchronization on visibility, focus, and page restore | `appResumeController.js` | Extracted; controller owns bind, idempotence, and cleanup |
| Initial DOM bootstrap and compact mobile theme label | `app.js` | Next low-risk listener-lifecycle candidate |

## Listener ownership

| Event source | Owner | Lifecycle |
| --- | --- | --- |
| `visibilitychange`, `focus`, `pageshow` | `appResumeController.js` | Idempotent `start()`, explicit `stop()` |
| Canvas pointer/click input | `input.js` | Bound once during app setup |
| Fullscreen and layout signals | `fullscreenController.js` | Controller-owned bind/destroy lifecycle |
| Language selector changes | `languageSelectors.js` | Controller-owned listeners and `dispose()` |
| Modal keyboard/click events | Each modal controller | Controller-owned listeners |
| First pointer/key audio unlock | `app.js` | One-shot listeners; candidate for extraction |
| Buttons for restart, start, undo, confirm, theme, and difficulty | `app.js` | Review in small groups; do not create a catch-all event bus |
| `DOMContentLoaded` and mobile theme media-query changes | `app.js` | Bootstrap-only; mobile theme listener is the next candidate |

## Next extraction order

1. Move compact mobile theme-label/media-query wiring into an idempotent controller.
2. Isolate first-gesture audio unlock listener ownership.
3. Separate diagnostics feedback buttons from the main DOM assembly.
4. Reassess runtime scheduling and turn-flow boundaries only after the low-risk listener slices remain green in CI.

Each slice must preserve game rules and public behavior, add focused listener lifecycle tests, keep Playwright green, and update this map plus Issue #4.

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
| Provider-neutral room, invite, presence, reconnect, and authority contract | `privateTableProtocol.js` | Keep outside `app.js`; future Friend Match controllers consume the adapter surface |
| Resume synchronization on visibility, focus, and page restore | `appResumeController.js` | Extracted; controller owns bind, idempotence, and cleanup |
| Compact mobile theme label | `mobileThemeLabelController.js` | Extracted; controller owns media/select listeners, cleanup, and translation refresh |
| Initial DOM bootstrap | `app.js` | Keep as composition-root work while startup remains a single page |

## Listener ownership

| Event source | Owner | Lifecycle |
| --- | --- | --- |
| `visibilitychange`, `focus`, `pageshow` | `appResumeController.js` | Idempotent `start()`, explicit `stop()` |
| Canvas pointer/click input | `input.js` | Bound once during app setup |
| Fullscreen and layout signals | `fullscreenController.js` | Controller-owned bind/destroy lifecycle |
| Language selector changes | `languageSelectors.js` | Controller-owned listeners and `dispose()` |
| Mobile theme media-query and theme selection changes | `mobileThemeLabelController.js` | Idempotent `start()`, explicit `stop()`, translation-aware `refresh()` |
| Modal keyboard/click events | Each modal controller | Controller-owned listeners |
| First pointer/key audio unlock | `app.js` | One-shot listeners; candidate for extraction |
| Buttons for restart, start, undo, confirm, theme, and difficulty | `app.js` | Review in small groups; do not create a catch-all event bus |
| `DOMContentLoaded` | `app.js` | Bootstrap-only composition root |

## Extraction checkpoint

Issue #4's focused lifecycle checkpoint is complete after the resume and mobile-theme listener slices. First-gesture audio unlock and diagnostics feedback remain valid future candidates, but they should be extracted only when adjacent product work touches them or evidence shows lifecycle risk. Nardora now returns to player-facing work on the social-platform critical path instead of extending cleanup for its own sake.

Future slices must preserve game rules and public behavior, add focused lifecycle tests, keep Playwright green, and update this map when ownership changes.

Issue #16 adds no listener or gameplay ownership to `app.js`. Its in-memory
adapter exposes `dispatch`, `getSnapshot`, and `subscribe`; a future Friend
Match controller will own the corresponding UI lifecycle without enabling the
currently disabled social mode until a real end-to-end flow exists.

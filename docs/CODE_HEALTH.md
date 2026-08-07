# Nardora Code-Health Policy and Refactor Plan

Last reviewed: **2026-08-07**
Owner: **MetinGames + Codex**
Execution issue: [#25](https://github.com/MetinGames/Long-Narde/issues/25)

## Purpose

File size is an early-warning signal, not a quality score. Nardora uses it
together with responsibility mix, churn, coupling, ownership and testability
to choose small extractions before shared files become unsafe to change.

This policy protects player-facing progress: refactoring must be measurable,
test-backed and reversible, not an open-ended rewrite.

## Thresholds

| Lines | Level | Required response |
|---:|---|---|
| Below 1,000 | Healthy by size | Continue normal review; cohesion still matters |
| 1,000–1,999 | Split candidate | Review mixed responsibilities, churn, coupling and tests |
| 2,000–2,999 | Refactor plan required | Document staged ownership before further growth |
| 3,000+ | Red zone | Prioritize a safe, staged and test-backed refactor |

Rules:

- Do not split a cohesive file merely to hit a number.
- Prefer one responsibility boundary per extraction.
- Keep legacy threshold crossings informational in CI at first.
- A pull request that grows a red-zone file must explain why the growth is
  necessary and identify the extraction or rollback boundary.
- Gameplay rules, visuals, i18n and responsive behavior must remain unchanged
  unless the pull request explicitly owns and tests such a change.

## Repeatable report

Run:

```bash
npm run code-health:report
```

Optional forms:

```bash
node scripts/code-health-report.mjs --all
node scripts/code-health-report.mjs --json
node scripts/code-health-report.mjs --root /path/to/checkout
```

The report scans JavaScript/TypeScript, CSS/SCSS, HTML and SQL source files.
It excludes generated output, dependencies, public assets, coverage and test
artifacts. Threshold crossings never fail CI by themselves.

## Baseline review

Baseline captured on **2026-08-03**:

| File | Lines | Level | Responsibilities | Churn signal | Coupling and test evidence |
|---|---:|---|---|---|---|
| `style.css` | 3,543 | Red zone | Global shell, start flow, game HUD, dialogs, Friend Match preview, themes and responsive rules | Shared surface changed by many UI features; quantify each planned slice with `git log --numstat -- style.css` | High selector/order coupling to `index.html`; protected by responsive tests, Playwright flows and visual baselines |
| `app.js` | 1,400 | Split candidate | App composition, start/restart flow, turn orchestration, controller wiring and player input | Active integration surface; review change history before extracting | Coupled to many focused controllers; lifecycle, pass-flow and app-wiring tests already provide seams |
| `engine/renderer.js` | 1,181 | Split candidate | Canvas board, pieces, status, effects and theme-aware drawing | Visual behavior changes less safely than pure modules; profile and inspect history first | Coupled to layout/themes/canvas state; visual and responsive tests are the release boundary |

The churn column deliberately avoids an invented numeric score. Before each
extraction, record path-specific history and the selectors/functions changed
together. Evidence, not file length alone, determines the slice.

## 2026-08-07 staged extraction checkpoint

- `engine/i18n.js` now owns only language detection, persistence, formatting,
  and DOM application; the static TR/EN/RU catalog lives in
  `engine/translations.js` with key-parity/fallback regressions unchanged.
- `engine/renderer.js` delegates default/validation/storage behavior to
  `engine/rendererThemePreference.js`; Canvas drawing stays in the renderer.
- The isolated Friend Match preview selector block moved from `style.css` to
  `friend-match-preview.css` in identical source order and is precached.
- The inline splash bootstrap moved from `index.html` to
  `engine/startup.js`; platform startup is isolated behind
  `engine/platformBootstrap.js` and `engine/yandexGamesBridge.js`.
- `app.js` remains the orchestration owner and only consumes the new platform
  boundary. Further splitting requires another coherent controller seam, not
  line-count-driven movement.

After this checkpoint the report records `style.css` at roughly 3,104 lines,
`app.js` at 1,846, `renderer.js` at 1,378, and `index.html` at 1,105. The
remaining crossings are visible follow-up signals; this delivery does not
claim the staged refactor complete.

## `style.css` staged extraction plan

No visual extraction belongs in the policy/report pull request.

### Stage 0 — Freeze the baseline

- Record selector groups and source order.
- Confirm desktop, portrait and landscape screenshots.
- Run responsive/static CSS tests and the Playwright matrix.
- Treat specificity and cascade order as compatibility contracts.

### Stage 1 — Tokens and global foundations

- Extract custom properties, reset/base rules, typography and shared controls.
- Preserve exact import/link order.
- Verify both shipped themes and focus/disabled states.

### Stage 2 — Start and dialog surfaces

- Extract start screen, guide, profile/statistics, feedback and local Friend
  Match preview styles by owned surface.
- Keep modal safe-area, focus and scroll behavior under existing tests.

### Stage 3 — Game shell and HUD

- Extract board shell, side panel, dice, timer, confirm/undo and collected-piece
  presentation.
- Do not change Canvas coordinates or gameplay input behavior.

### Stage 4 — Responsive ownership

- Move media-query rules with their owning surface where cascade behavior
  remains stable; keep a final responsive layer only for cross-surface rules.
- Verify iPhone portrait/landscape plus desktop browser baselines after every
  slice.

### Delivery and rollback

- One stage or smaller responsibility per pull request.
- Preserve CSS source order first; optimize selectors only in a later change.
- Update the service-worker cache inventory/version whenever a precached shell
  file changes, as required by D-017.
- Revert one extraction commit/link to roll back; never require a broad rewrite.

## Next evidence-backed candidates

### `app.js`

1. Extract start-screen dialog/controller composition from `bindEvents()`
   without moving game authority.
2. Extract language/theme/UI refresh orchestration behind a focused coordinator.
3. Keep turn rules and meaningful player choices inside the existing game flow.

### `engine/renderer.js`

1. Inventory pure Canvas drawing primitives versus stateful orchestration.
2. Extract only pure, parameter-driven board/checker primitives first.
3. Measure rendering cost before adding caches, workers or a new architecture.

Each candidate needs a focused Issue or an explicit #25 follow-up, current
path-history evidence, tests that own the boundary, and a rollback plan.

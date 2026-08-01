# Nardora Repository Guidance

These instructions apply to the entire repository.

## Read before changing the project

1. Read `docs/PROJECT_CONTEXT.md` for the product north star, player promise, quality gates, risks, and authority boundaries.
2. Read `docs/DECISION_LOG.md` for accepted and open product/architecture decisions.
3. Read `ROADMAP.md` for the current phase, dates, gaps, and active priorities.
4. Inspect the relevant GitHub Issue before implementing planned work.

If code, tests, documentation, Issues, or conversation context disagree, surface the contradiction. Do not silently choose an interpretation.

## Product invariants

- The player-facing brand is **Nardora**. Use “Long Narde” only for the game type or rules.
- Preserve the existing `MetinGames/Long-Narde` repository name and GitHub Pages URL unless Metin explicitly approves a migration.
- English is the default interface; Turkish and Russian remain first-class and aligned.
- Rule behavior is a release contract. Do not change a game rule without explicit approval and regression tests.
- Automation must not remove a meaningful legal player choice.
- Camera and microphone are off by default in future social features.
- Never place secrets, privileged credentials, or trusted competitive outcomes in client code.

## Engineering rules

- Preserve the web-first JavaScript module and Canvas architecture unless measured evidence and explicit approval justify a migration.
- Prefer small, coherent, test-backed extractions over broad rewrites.
- Keep event-listener and lifecycle ownership explicit; avoid duplicate/stale listeners.
- Treat mobile touch, portrait, landscape, safe areas, fullscreen/focus and overflow as core behavior.
- Keep player-facing i18n keys synchronized across English, Turkish and Russian.
- Profile bot/search/rendering costs before adding workers or complex caching.
- Do not delete branches or data without a verified inventory and explicit approval.

## Verification

- Run `npm test` for every behavior-affecting change.
- Add or update regression tests for rule changes and bug fixes.
- Run relevant Playwright projects once end-to-end coverage is present.
- Verify the deployed or preview build after release-related changes.
- A feature is complete only when its acceptance criteria, tests, responsive behavior, i18n, diagnostics/fallbacks, and documentation are complete.

## Delivery and synchronization

- GitHub Issues are the execution queue; `ROADMAP.md` is the phase plan.
- Record a new idea as Now, Next, Later, Research, or Reject/Archive before it displaces active work.
- Update the Issue and ROADMAP in the same delivery cycle that completes a roadmap item.
- Amend `docs/DECISION_LOG.md` when a durable product or architecture decision changes.
- Amend `docs/PROJECT_CONTEXT.md` when strategy, target player, quality gates, risk posture, or authority boundaries change.
- Prefer one focused pull request/commit scope with measurable acceptance criteria.

## Authority boundaries

Metin is Product Owner. Ask for explicit confirmation before spending money, opening paid services, changing rules or approved brand direction, collecting new personal data, changing privacy/moderation policy, publishing to stores, contacting third parties, deleting material data/branches, or starting a high-risk architecture migration.

Within an authorized task, proactively investigate risks and dependencies, propose higher-leverage options, improve relevant tests and delivery safety, and identify the next best action.

# Start menu design QA

## Comparison

- Reference: previous Chrome visual baseline at the same desktop state and width.
- Implementation: compact start menu rendered by the GitHub Actions Chrome runner.
- Combined review image: `design-qa-start-menu-comparison.png` (reference on the left, implementation on the right).

## Checks

- The main hierarchy remains intact: Quick Play keeps the gold emphasis, Bot Match stays prominent, and inactive modes are visually quieter.
- Secondary actions are equal-height compact controls; the visible theme label is shortened to `Theme` / `Tema` while retaining its full accessible name.
- A saved match is presented beside the Game Modes heading as a 44 px resume action instead of a large standalone card.
- The 1280 x 720 saved-match regression reports no internal start-panel overflow.
- Resume, secondary, select, and compact mobile color controls remain at least 44 px high.
- The complete Chrome, Firefox, WebKit, iPhone portrait, and iPhone landscape Playwright matrix passed.
- Node test suite passed: 471 / 471.
- CodeQL and repository security-health checks passed.

## Result

passed

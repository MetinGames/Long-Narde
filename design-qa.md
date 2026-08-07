# Board-first start menu design QA

## Target and scope

- Selected direction: Product Design option 2, a cinematic board-first lobby with the Long Narde board on the left, a narrow launch panel on the right and a restrained three-action utility bar.
- Implemented in `index.html` and `start-lobby.css`; the generated board-only artwork is stored as `assets/boards/nardora-start-board-preview.webp`.
- Existing mode IDs, local preferences, resume behavior, localization, dialogs and game rules remain unchanged.
- `design-qa-start-menu-comparison.png` is retained as the superseded pre-redesign comparison and is not evidence for this board-first revision.

## Static and automated checks

- Quick Play is the only gold primary action; Bot Match remains secondary and unavailable modes are quieter.
- Continue Match is a 48 px single-line row instead of a large standalone card.
- Language, checker color, difficulty and turn time use compact rows; phone selects and options remain at least 44 px high.
- Portrait stacks a 106–142 px board preview above the launch panel. Low-height landscape keeps board and panel adjacent, compacts settings into two columns and keeps inactive modes side by side.
- The start utility bar keeps How to Play, Profile and Theme at 48 px on desktop and 44 px on phone.
- The 142 KB WebP board asset and the new stylesheet are included in the versioned PWA precache.
- Node, PWA, roadmap and source-integrity checks are recorded in the verification run for this change.

## Browser comparison gate

- The local preview relay was unavailable in this Work Mode runtime.
- The configured Chromium/WebKit executables were absent, and their download endpoint was blocked by the runtime network policy.
- Therefore no new same-viewport browser screenshot could be placed beside the selected target in this run. This is an infrastructure limitation, not visual pass evidence.

## Result

**Conditional pass:** implementation and automated contracts pass; Chrome desktop and physical iPhone 16e Safari portrait/landscape visual comparison remains required before issue #79 closes.

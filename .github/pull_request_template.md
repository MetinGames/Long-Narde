## What changed

<!-- Describe the player or engineering outcome and link the Issue. -->

## Verification

- [ ] Relevant Node tests pass
- [ ] Relevant Playwright/device checks pass or are not applicable
- [ ] TR/EN/RU remain aligned when player-facing copy changes
- [ ] Gameplay rules and meaningful player choices are unchanged, or the
      approved rule change has regression tests

## Code health

- [ ] I ran `npm run code-health:report`
- [ ] This change does not grow a red-zone file
- [ ] If a red-zone file grows, the reason, extraction boundary and rollback
      plan are documented below

Red-zone justification, if needed:

<!-- Explain why the growth is necessary and how it will be safely extracted. -->
